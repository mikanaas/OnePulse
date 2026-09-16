import { Router, type Request } from "express";
import { db } from "../lib/db";
import { requireAuth } from "../lib/requireAuth";
import { proposalsTable, projectsTable, usersTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";

const router = Router();

function proposalWithSubmitter(proposal: typeof proposalsTable.$inferSelect, submittedByName: string | null) {
  return { ...proposal, submittedByName };
}

type MicrosoftProfile = {
  id: string;
  displayName?: string;
  mail?: string;
  userPrincipalName?: string;
};

function jwtTenantId(token: string): string | undefined {
  try {
    const payload = token.split(".")[1];
    if (!payload) return undefined;
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")).tid;
  } catch {
    return undefined;
  }
}

async function verifyMicrosoftProfile(req: Request): Promise<MicrosoftProfile | null> {
  const tenantId = process.env.MICROSOFT_ENTRA_TENANT_ID;
  if (!tenantId) return null;

  const authorization = req.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
  if (!token || jwtTenantId(token) !== tenantId) return null;

  const response = await fetch("https://graph.microsoft.com/v1.0/me?$select=id,displayName,mail,userPrincipalName", {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!response.ok) return null;
  return await response.json() as MicrosoftProfile;
}

// GET /api/outlook/manifest.xml
router.get("/outlook/manifest.xml", (req, res) => {
  const forwardedProto = req.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = req.get("x-forwarded-host")?.split(",")[0]?.trim();
  const origin = `${forwardedProto ?? req.protocol}://${forwardedHost ?? req.get("host")}`;
  const sourceLocation = `${origin}/outlook-addin`;
  const iconLocation = `${origin}/opengraph.jpg`;
  const manifest = `<?xml version="1.0" encoding="UTF-8"?>
<OfficeApp xmlns="http://schemas.microsoft.com/office/appforoffice/1.1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:bt="http://schemas.microsoft.com/office/officeappbasictypes/1.0"
  xmlns:mailappor="http://schemas.microsoft.com/office/mailappversionoverrides/1.0"
  xsi:type="MailApp">
  <Id>43d24a28-69ae-44a7-9a24-b9cc353eff31</Id>
  <Version>1.0.0.0</Version>
  <ProviderName>OnePulse</ProviderName>
  <DefaultLocale>nb-NO</DefaultLocale>
  <DisplayName DefaultValue="OnePulse forbedringsforslag"/>
  <Description DefaultValue="Registrer forbedringsforslag direkte fra Outlook."/>
  <IconUrl DefaultValue="${iconLocation}"/>
  <HighResolutionIconUrl DefaultValue="${iconLocation}"/>
  <SupportUrl DefaultValue="${origin}"/>
  <AppDomains><AppDomain>${origin}</AppDomain></AppDomains>
  <Hosts><Host Name="Mailbox"/></Hosts>
  <Requirements><Sets><Set Name="Mailbox" MinVersion="1.3"/></Sets></Requirements>
  <FormSettings>
    <Form xsi:type="ItemRead">
      <DesktopSettings><SourceLocation DefaultValue="${sourceLocation}"/><RequestedHeight>300</RequestedHeight></DesktopSettings>
    </Form>
  </FormSettings>
  <Permissions>Restricted</Permissions>
  <Rule xsi:type="RuleCollection" Mode="Or"><Rule xsi:type="ItemIs" ItemType="Message" FormType="Read"/></Rule>
  <DisableEntityHighlighting>false</DisableEntityHighlighting>
  <VersionOverrides xmlns="http://schemas.microsoft.com/office/mailappversionoverrides" xsi:type="VersionOverridesV1_0">
    <Requirements><bt:Sets DefaultMinVersion="1.3"><bt:Set Name="Mailbox"/></bt:Sets></Requirements>
    <Hosts>
      <Host xsi:type="MailHost">
        <DesktopFormFactor>
          <ExtensionPoint xsi:type="MessageReadCommandSurface">
            <OfficeTab id="TabDefault">
              <Group id="OnePulse.Group">
                <Label resid="Group.Label"/>
                <Control xsi:type="Button" id="OnePulse.SendProposal">
                  <Label resid="Button.Label"/>
                  <Supertip><Title resid="Button.Label"/><Description resid="Button.Description"/></Supertip>
                  <Icon>
                    <bt:Image size="16" resid="Icon.16"/>
                    <bt:Image size="32" resid="Icon.32"/>
                    <bt:Image size="80" resid="Icon.80"/>
                  </Icon>
                  <Action xsi:type="ShowTaskpane"><SourceLocation resid="Taskpane.Url"/></Action>
                </Control>
              </Group>
            </OfficeTab>
          </ExtensionPoint>
        </DesktopFormFactor>
      </Host>
    </Hosts>
    <Resources>
      <bt:Images>
        <bt:Image id="Icon.16" DefaultValue="${iconLocation}"/>
        <bt:Image id="Icon.32" DefaultValue="${iconLocation}"/>
        <bt:Image id="Icon.80" DefaultValue="${iconLocation}"/>
      </bt:Images>
      <bt:Urls><bt:Url id="Taskpane.Url" DefaultValue="${sourceLocation}"/></bt:Urls>
      <bt:ShortStrings>
        <bt:String id="Group.Label" DefaultValue="OnePulse"/>
        <bt:String id="Button.Label" DefaultValue="Nytt forslag"/>
      </bt:ShortStrings>
      <bt:LongStrings><bt:String id="Button.Description" DefaultValue="Registrer et nytt forbedringsforslag i OnePulse."/></bt:LongStrings>
    </Resources>
  </VersionOverrides>
</OfficeApp>`;
  res.type("application/xml").send(manifest);
});

// GET /api/outlook/config
router.get("/outlook/config", (_req, res) => {
  const clientId = process.env.MICROSOFT_ENTRA_CLIENT_ID;
  const tenantId = process.env.MICROSOFT_ENTRA_TENANT_ID;
  if (!clientId || !tenantId) {
    res.status(503).json({ error: "Microsoft 365 integration is not configured" });
    return;
  }
  res.json({ clientId, tenantId });
});

// GET /api/proposals
router.get("/proposals", requireAuth, async (req, res) => {
  const { status, effect, complexity } = req.query as Record<string, string | undefined>;

  const rows = await db
    .select({ proposal: proposalsTable, submittedByName: usersTable.name })
    .from(proposalsTable)
    .leftJoin(usersTable, eq(proposalsTable.submittedBy, usersTable.id));

  let results = rows.map(({ proposal, submittedByName }) => ({
    ...proposal,
    submittedByName: submittedByName ?? (proposal.source === "outlook" ? proposal.sourceSender : null),
  }));

  if (status) results = results.filter((r) => r.status === status);
  if (effect) results = results.filter((r) => r.effect === effect);
  if (complexity) results = results.filter((r) => r.complexity === complexity);

  results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(results);
});

// POST /api/proposals
router.post("/proposals", requireAuth, async (req, res) => {
  const user = (req as any).dbUser;
  const body = req.body as any;

  const [proposal] = await db.insert(proposalsTable).values({
    title: body.title,
    description: body.description,
    type: body.type ?? "problem",
    solutionDescription: body.solutionDescription ?? null,
    effect: body.effect ?? "liten",
    complexity: body.complexity ?? "krevende",
    status: "ny",
    submittedBy: user.id,
  }).returning();

  const row = await db
    .select({ proposal: proposalsTable, submittedByName: usersTable.name })
    .from(proposalsTable)
    .leftJoin(usersTable, eq(proposalsTable.submittedBy, usersTable.id))
    .where(eq(proposalsTable.id, proposal.id))
    .then((r) => r[0]);

  res.status(201).json({ ...row.proposal, submittedByName: row.submittedByName });
});

// POST /api/proposals/outlook
router.post("/proposals/outlook", async (req, res) => {
  if (!process.env.MICROSOFT_ENTRA_TENANT_ID) {
    res.status(503).json({ error: "Microsoft 365 integration is not configured" });
    return;
  }

  const profile = await verifyMicrosoftProfile(req);
  if (!profile) {
    res.status(401).json({ error: "Invalid Microsoft 365 identity" });
    return;
  }

  const { submissionId, title, description, type, solutionDescription, effect, complexity } = req.body as {
    submissionId: string;
    title: string;
    description: string;
    type: "problem" | "solution";
    solutionDescription?: string;
    effect: "stor" | "liten";
    complexity: "krevende" | "enkel";
  };
  if (!submissionId?.trim() || !title?.trim() || !description?.trim()) {
    res.status(400).json({ error: "Missing required proposal fields" });
    return;
  }

  const [duplicate] = await db
    .select()
    .from(proposalsTable)
    .where(eq(proposalsTable.sourceMessageId, submissionId))
    .limit(1);

  if (duplicate) {
    res.json({ proposal: proposalWithSubmitter(duplicate, duplicate.sourceSender), created: false });
    return;
  }

  const email = profile.mail ?? profile.userPrincipalName ?? "";
  const sender = [profile.displayName, email && `<${email}>`].filter(Boolean).join(" ");
  const [proposal] = await db.insert(proposalsTable).values({
    title: title.trim(),
    description,
    type,
    solutionDescription: type === "solution" ? solutionDescription?.trim() || null : null,
    effect,
    complexity,
    status: "ny",
    submittedBy: null,
    source: "outlook",
    sourceMessageId: submissionId,
    sourceSender: sender || email || profile.id,
  }).returning();

  res.status(201).json({
    proposal: proposalWithSubmitter(proposal, profile.displayName ?? email),
    created: true,
  });
});

// PATCH /api/proposals/:id
router.patch("/proposals/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const body = req.body as any;
  const updateData: any = {};

  for (const key of ["title", "description", "solutionDescription", "effect", "complexity", "status"]) {
    if (body[key] !== undefined) updateData[key] = body[key];
  }

  const [updated] = await db.update(proposalsTable).set(updateData).where(eq(proposalsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }

  const row = await db
    .select({ proposal: proposalsTable, submittedByName: usersTable.name })
    .from(proposalsTable)
    .leftJoin(usersTable, eq(proposalsTable.submittedBy, usersTable.id))
    .where(eq(proposalsTable.id, id))
    .then((r) => r[0]);

  res.json({ ...row.proposal, submittedByName: row.submittedByName });
});

// DELETE /api/proposals/:id
router.delete("/proposals/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(proposalsTable).where(eq(proposalsTable.id, id));
  res.status(204).end();
});

// POST /api/proposals/:id/convert
router.post("/proposals/:id/convert", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const user = (req as any).dbUser;
  const body = req.body as any;

  const [existing] = await db.select().from(proposalsTable).where(eq(proposalsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }

  const [project] = await db.insert(projectsTable).values({
    name: body.name,
    description: body.description ?? existing.description,
    businessUnit: body.businessUnit ?? null,
    status: "ide",
    ownerId: user.id,
    goalText: body.goalText ?? null,
  }).returning();

  await db.update(proposalsTable).set({
    status: "konvertert",
    convertedToProjectId: project.id,
  }).where(eq(proposalsTable.id, id));

  res.status(201).json({ projectId: project.id });
});

export default router;
