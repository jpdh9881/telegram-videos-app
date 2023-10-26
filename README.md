# Awesome Project Build with TypeORM

Steps to run this project:

1. Run `npm i` command
2. Setup database settings inside `data-source.ts` file
3. Run `npm start` command

## Running Migrations

```
tsc
npx typeorm-ts-node-esm migration:run --dataSource "./build/data-source.js"
```

## Queries

```
-- Get messages that have videos with duplicate hashes
WITH duplicate_hashes AS (
	SELECT COUNT(d.hash_id) count, d.hash_id FROM document d
	JOIN hash h ON h.id = d.hash_id
	WHERE h.tg_sha256 IS NOT NULL
	GROUP BY d.hash_id
	ORDER BY count DESC
)
SELECT d.hash_id, d.tg_date, d.* FROM message m
JOIN document d ON d.id = m.document_id
JOIN processed_status p ON p.id = d.processed_status_id
JOIN hash h ON h.id = d.hash_id
WHERE d.hash_id IN (SELECT hash_id FROM duplicate_hashes WHERE count >=2)
ORDER BY d.hash_id, d.tg_date ASC;
```