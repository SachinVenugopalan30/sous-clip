# Upgrading to 2.0

Version 2.0 moves Postgres (used only by Temporal) to a new major version. Postgres cannot read the old data directory, so remove the Temporal volume before you upgrade.

If you skip this, the new Postgres refuses to start (it detects the old data and exits with an error), so `temporal-db` keeps failing and Temporal and the app never come up. Removing the volume then re-running the steps fixes it.

**Your recipes are not affected.** They live in SQLite in the `app-data` volume, which you keep. The only thing lost is extractions that are in progress when you upgrade, so let the queue finish first if you can.

- Do **not** remove `app-data`.
- Do **not** run `docker compose down -v`. It deletes every volume, including `app-data`.

## Steps

Compose files are not updated by `docker compose pull` or Watchtower, so fetch the new `docker-compose.yml` first:

```bash
git pull
```

If you edited `docker-compose.yml` (GPU, Podman), re-apply your edits after `git pull`. Podman users: substitute `podman` for `docker` in the commands below.

Watchtower users: Watchtower updates the `app` and `worker` images but not `docker-compose.yml`, so an auto-updated install may be running 2.0 against the old Temporal, Postgres and Valkey until you follow these steps.

Then, from the same folder:

```bash
docker compose down
docker volume ls -f label=com.docker.compose.volume=temporal-data
docker volume rm <project>_temporal-data
docker compose pull
docker compose up -d
```

Docker prefixes volume names with the Compose project name, which is the folder name by default (or whatever `COMPOSE_PROJECT_NAME` / `-p` is set to). For a checkout in `sous-clip/`, the volume is `sous-clip_temporal-data`. Use the name that `docker volume ls` prints. Remove only the `temporal-data` one.

## What you will see

Temporal now runs as `temporal` plus two one-shot setup services, `temporal-schema` and `temporal-namespace`. After startup, `docker compose ps -a` shows both setup services as `exited (0)`. That is expected.

Valkey also moves to a new major version. It reads the existing `valkey-data` volume without any action from you.
