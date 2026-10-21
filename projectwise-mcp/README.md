# ProjectWise MCP Server

An **STDIO-based Model Context Protocol (MCP) server** for VS Code that exposes **Bentley ProjectWise** (via the **Web Services Gateway / WSG REST API**) as MCP tools.

## What it does

- 🔌 STDIO transport for safe subprocess comms with MCP-capable VS Code clients
- 📁 Folder navigation and metadata
- 📄 Document listing, search, and metadata
- 🏗️ Project listing
- 📊 Repository info lookup

## Requirements

- Node.js 18+
- npm
- VS Code with an MCP client (GitHub Copilot Chat or compatible)
- Network access to a ProjectWise WSG deployment

## Quick start

```bash
cd projectwise-mcp
npm install
npm run build
```

Configure environment (copy the template):

```bash
cp .env.example .env
```

Fill these variables:

| Variable | Description |
|----------|-------------|
| `PW_WSG_BASE_URL` | WSG base URL, e.g. `https://server/ws/v2.8` |
| `PW_REPOSITORY_ID` | Repository/datasource GUID |
| `PW_TOKEN` | Bearer token from Bentley IMS |
| `PW_APP_GUID` | Optional, defaults to `projectwise-mcp-server` |
| `PW_SESSION_UUID` | Optional; auto-generated if omitted |

Run the server:

```bash
# TypeScript + auto-reload
npm run dev

# Built JS
npm start
```

## VS Code (MCP) setup

The repo ships with `.vscode/mcp.json` pre-wired for the STDIO server. If you need to wire manually, add to settings:

```json
{
  "mcp.servers": {
    "projectwise": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/projectwise-mcp/dist/server.js"],
      "env": {
        "PW_WSG_BASE_URL": "https://your-server/ws/v2.8",
        "PW_REPOSITORY_ID": "your-repo-guid",
        "PW_TOKEN": "your-bentley-ims-token"
      }
    }
  }
}
```

## Tools exposed

| Tool | Description |
|------|-------------|
| `list_folders` | List folders (optionally by parent ID) |
| `list_documents` | List documents in a folder |
| `get_document` | Get document metadata by ID |
| `search_documents` | Search documents by name pattern |
| `get_folder` | Get folder metadata by ID |
| `list_projects` | List all projects |
| `get_repository_info` | Get repository information |

## Auth and tokens

Authentication is **token-only** (Bearer token from Bentley IMS). A helper script can automate token capture with Playwright:

```bash
npm run token:playwright
```

Basic auth is not supported. The VS Code profile configuration can prompt for the token without saving it in `mcp.json`.
The optional Playwright helper writes the captured token to `login/token.json`; avoid running it unless you specifically need that file.

## Security notes

- Folder, document, and repository IDs must be GUIDs. Requests are restricted to the configured repository.
- Search text is escaped before it is added to the WSG filter.
- ProjectWise results may contain user-authored text. The server labels results as untrusted, but this cannot eliminate prompt-injection risk. Use a narrowly scoped ProjectWise account and review consequential agent actions.
- Do not run the Playwright token helper unless you explicitly want it to write the captured token to `login/token.json`.

## Development

```bash
# Type checking in watch mode
npm run watch

# Dev server with tsx
npm run dev
```

Logs are written to stderr (required by STDIO transports); view them in VS Code’s Output panel when running under an MCP client.

## Troubleshooting

- Connection: verify `PW_WSG_BASE_URL` is reachable and the repository ID is correct.
- Auth: `401`/`403` usually means an invalid/expired token or missing repository permissions.
- WSG queries support `$filter`, `$select`, `$top`, `$skip`, `$orderby` if you add them inside client calls.

## License

ISC
