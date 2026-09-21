# Azure App Factory deployment

This branch prepares OnePulse to run as one full-stack container in Azure Container Apps.

## Runtime

- React/Vite frontend is built to static files.
- Express serves both the frontend and the existing API.
- The container listens on port `8080`.
- Persistent data stays outside the container in PostgreSQL.
- `DATABASE_URL` can point to a PostgreSQL server hosted on the OneCo network.

## Microsoft SSO

Authentication is intended to be handled by Azure Container Apps built-in authentication with Microsoft Entra ID.

The application trusts the identity headers injected by Container Apps, including:

- `x-ms-client-principal-id`
- `x-ms-client-principal-name`
- `x-ms-client-principal`

Clerk is no longer required by the application code on this branch. The existing database field named `clerk_id` is temporarily reused to store the Entra object ID so that this migration does not require an immediate database migration. Rename that field in a later schema migration.

Container Apps should be configured to require authentication and use the OneCo Microsoft Entra tenant.

## Database

Required:

`DATABASE_URL=postgresql://user:password@host:5432/onepulse`

For an on-premises database, the production Container Apps Environment must have network connectivity to the OneCo network, normally through an Azure VNet connected by VPN or ExpressRoute.

The current public sandbox environment can be used to validate the container and SSO flow, but it will not reach a private on-premises database unless networking is added.

## Other environment variables

- `ANTHROPIC_API_KEY` is optional. AI routes degrade gracefully without it.
- `PORT` defaults to the container setting `8080`.
- `STATIC_DIR` defaults to `/app/public` in the Docker image.

Secrets such as `DATABASE_URL` and AI keys should be supplied from Azure secrets/Key Vault, not committed to Git.

## Build

```sh
docker build -t onepulse .
docker run --rm -p 8080:8080 \
  -e DATABASE_URL="postgresql://..." \
  onepulse
```

## Azure settings

Container Apps ingress target port: `8080`.

The deployment pipeline should eventually:

1. Build this Docker image.
2. Push it to Azure Container Registry.
3. Deploy the immutable image tag to the OnePulse Container App.
4. Keep production deployment behind an explicit approval step.
