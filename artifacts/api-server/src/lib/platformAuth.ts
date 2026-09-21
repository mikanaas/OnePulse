import type { Request } from "express";

type PrincipalClaim = {
  typ?: string;
  val?: string;
};

type ClientPrincipal = {
  userId?: string;
  userDetails?: string;
  claims?: PrincipalClaim[];
};

export type PlatformIdentity = {
  id: string;
  email: string;
  name: string;
};

function decodePrincipal(value: string | undefined): ClientPrincipal | null {
  if (!value) return null;

  try {
    const json = Buffer.from(value, "base64").toString("utf8");
    return JSON.parse(json) as ClientPrincipal;
  } catch {
    return null;
  }
}

function findClaim(principal: ClientPrincipal | null, ...names: string[]): string | undefined {
  const claims = principal?.claims ?? [];

  for (const name of names) {
    const match = claims.find((claim) => {
      const type = claim.typ?.toLowerCase();
      const target = name.toLowerCase();
      return type === target || type?.endsWith(`/claims/${target}`);
    });

    if (match?.val) return match.val;
  }

  return undefined;
}

/**
 * Reads the authenticated user injected by Azure Container Apps built-in
 * authentication (Easy Auth). Authentication is deliberately enforced by the
 * platform rather than by a JavaScript authentication SDK in the application.
 */
export function getPlatformIdentity(req: Request): PlatformIdentity | null {
  const principal = decodePrincipal(req.get("x-ms-client-principal") ?? undefined);

  const id =
    req.get("x-ms-client-principal-id") ??
    principal?.userId ??
    findClaim(principal, "oid", "objectidentifier");

  if (!id) return null;

  const principalName =
    req.get("x-ms-client-principal-name") ??
    principal?.userDetails ??
    findClaim(
      principal,
      "preferred_username",
      "email",
      "emailaddress",
      "upn",
    );

  const email = principalName?.trim().toLowerCase() || `${id}@entra.local`;
  const name =
    findClaim(principal, "name", "givenname") ??
    principalName?.split("@")[0] ??
    "OneCo user";

  return { id, email, name };
}
