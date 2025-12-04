# Zeitraum

Log time with tags using [Zeitraum](https://github.com/KennethWussmann/zeitraum).

## Requirements

To use this extension you need a self-hosted Zeitraum server. Consult the official [installation guide](https://github.com/KennethWussmann/zeitraum) on how to do this.

Once installed, the extension requires a login to the Zeitraum instance.

## Development

The following instructions only apply to developers of this extension.

### Docker Compose

> Requires Docker and Docker Compose

There is a `docker-compose.yml` that allows starting a local Zeitraum server for development.

Start it using:

```sh
docker compose up -d
```

When the server is started and the extension asks for credentials:

**Server URL:** `http://localhost:3030`

**API Token:** `raycast`
