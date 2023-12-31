# Telegram Video Scraper, for Ukraine Map Update

Steps to run this project:

1. Run `npm i` command
2. Setup database settings inside `data-source.ts` file
3. Run `npm start` command

## Log of Changes

2024-01-05
	- adds marshal: all instances/jobs now run as forked child processes
	- separated logs: each instance gets its own log
  	- made log messages more specific (since all instances' STDOUTs inherit parent's)
	- better logging to discord
	- added a fourth instance
	- actually converts times to EST
	- a telepathy service that made sense at one point and is really a step forward in human evolution but doesn't work

2024-01-03
	- adds to ChannelStats job and runs it in morning (helped me discover that I was missing a lot of channels!)
	- converts times to EST
	- fixes logic that was ignoring A LOT of channels (LEFT JOIN vs. INNER JOIN :'( )
	- some refactoring

2024-01-01
	- new channel sort order (by # of messages associated with each, ASC)
	- new method of batching messages to avoid expired file references (get 25 messages and process them, then get 25 more messages... until finished with messages in that channel)
	- changes logging:
  	- more restrictive logging to Discord telegram channel
  	- more detailed logging to Discord telegram_debug channel
  	- better logging messages
	- new channel group (5, TempCatchup) for channels that need history caught up

2023-12-23
	- support for running multiple instances of app:
		- changed telegram init code (requires separate set of telegram credentials per instance of app)
		- addition of channel groups, so that can run multiple instances of app on different groups of channels
		- made scrape-and-hash jobs just one job, w/ ability to define which channel groups to target
	- support for two discord channels (for notifications)
	- refined delays to minimize the flooding voodoo
	- fixed "get missing hashes" job to deal with missing hashes

2023-11-14
	- better discord notifications
	- cron jobs
	- random delays
	- had to change Messages / Documents due to weird Telegram results
before 2023-11-03
	- stuff

## Migrations

```
go to ./src
typeorm migration:create ./migration/MIGRATION_NAME
```

```
go to root of project (../src)
tsc
npm run migrate
```

## Queries

```
-- Get messages that have videos with duplicate hashes
WITH duplicate_hashes AS (
	SELECT COUNT(d.hash_id) count, d.hash_id FROM document1 d
	JOIN hash1 h ON h.id = d.hash_id
	WHERE h.tg_sha256 IS NOT NULL
	GROUP BY d.hash_id
	ORDER BY count DESC
)
SELECT d.hash_id, FROM_UNIXTIME(d.tg_date), d.* FROM message1 m
JOIN document1 d ON d.message_id = m.id
JOIN processed_status1 ps ON ps.document_id = d.id
JOIN hash1 h ON h.id = d.hash_id
WHERE d.hash_id IN (SELECT hash_id FROM duplicate_hashes WHERE count >=2)
ORDER BY d.hash_id, d.tg_date ASC;
```

## Detecting Duplicates: Methods

1. Hash
2. File name
3. Duration
4. Thumbs

``` From videos with different hashes, durations, but which are dupes
"thumbs": [
	{
		"type": "i",
		"bytes": {
			"type": "Buffer",
			"data": [1, 22, 40, 197, 162, 138, 40, 0, 162, 138, 40, 0, 162, 138, 40, 0, 162, 138, 40, 0, 162, 138, 40, 0, 162, 138, 40, 3]
		},
		"className": "PhotoStrippedSize"
	},
	{
		"type": "m",
		"w": 320,
		"h": 180,
		"size": 1198,
		"className": "PhotoSize"
	}
],

"thumbs": [
	{
		"type": "i",
		"bytes": {
			"type": "Buffer",
			"data": [1, 22, 40, 197, 162, 138, 40, 0, 162, 138, 40, 0, 162, 138, 40, 0, 162, 138, 40, 0, 162, 138, 40, 0, 162, 138, 40, 3]
		},
		"className": "PhotoStrippedSize"
	},
	{
		"type": "m",
		"w": 320,
		"h": 180,
		"size": 644,
		"className": "PhotoSize"
	}
],
```

```Another example
"thumbs": [
	{
		"type": "i",
		"bytes": {
			"type": "Buffer",
			"data": [1, 22, 40, 197, 162, 138, 40, 0, 162, 138, 40, 0, 162, 138, 40, 1, 204, 0, 198, 9, 233, 206, 125, 105, 180, 81, 64, 5, 20, 81, 64, 5, 20, 81, 64, 31]
		},
		"className": "PhotoStrippedSize"
	},
	{
		"type": "m",
		"w": 320,
		"h": 180,
		"size": 1526,
		"className": "PhotoSize"
	}
],

"thumbs": [
	{
		"type": "i",
		"bytes": {
			"type": "Buffer",
			"data": [1, 23, 40, 197, 162, 138, 40, 0, 162, 138, 40, 0, 162, 138, 40, 1, 204, 0, 198, 8, 57, 25, 250, 83, 104, 162, 128, 10, 40, 162, 128, 10, 40, 162, 128, 63]
		},
		"className": "PhotoStrippedSize"
	},
	{
		"type": "m",
		"w": 320,
		"h": 181,
		"size": 881,
		"className": "PhotoSize"
	}
],
```

```
SELECT
	m.id, d.hash_id, JSON_EXTRACT(m.raw, '$.media.document.thumbs[0].bytes.data') as data
FROM document1 d
JOIN message1 m ON m.id = d.message_id
WHERE JSON_EXTRACT(m.raw, '$.media.document.thumbs[0].className') = 'PhotoStrippedSize';
```

## Extracting PhotoStrippedSize and Updating Document1

```

SELECT * FROM `document1` WHERE tg_thumb_PhotoStrippedSize IS NULL;

UPDATE document1 d
INNER JOIN message1 m ON m.id = d.message_id SET d.tg_thumb_PhotoStrippedSize = JSON_EXTRACT(m.raw, '$.media.document.thumbs[0].bytes.data')
WHERE d.tg_thumb_PhotoStrippedSize IS NULL and JSON_EXTRACT(m.raw, '$.media.document.thumbs[0].className') = 'PhotoStrippedSize';

-----

-- First attempt for detecting similarity of the stripped thumbnails

DROP FUNCTION IF EXISTS compare_PhotoStrippedSize;

DELIMITER $$

CREATE FUNCTION compare_PhotoStrippedSize (array1 JSON, array2 JSON, threshold INTEGER) RETURNS INTEGER
DETERMINISTIC
COMMENT 'Provides a score for determining how similar the two passed-in thumbs are.'
BEGIN
    DECLARE score INTEGER DEFAULT 0;
    DECLARE i INTEGER DEFAULT 0;
    DECLARE first JSON;
    DECLARE second JSON;
    DECLARE diff INTEGER;

    IF JSON_LENGTH(array1) < JSON_LENGTH(array2) THEN
        SET first = array1;
        SET second = array2;
    ELSE
        SET first = array2;
        SET second = array1;
    END IF;

    WHILE (i < JSON_LENGTH(first) and score <= threshold) DO
        SET diff = ABS(JSON_EXTRACT(first, CONCAT('$[', i, ']')) - JSON_EXTRACT(second, CONCAT('$[', i, ']')));
				IF (diff != 0) THEN
					SET score = score + 1;
				END IF;
        SET i = i + 1;
    END WHILE;

    RETURN score;
END$$

DELIMITER ;

----- Some raw columns were given JSON.stringified data instead of straight object data, and therefore had escape sequences

use built-in function JSON_UNQUOTE

-----

SELECT d.message_id, m.tg_id, ch.name, compare_PhotoStrippedSize('[1, 22, 40, 197, 162, 138, 40, 0, 162, 138, 40, 0, 162, 138, 40, 0, 162, 138, 40, 0, 162, 138, 40, 0, 162, 138, 40, 3]', d.tg_thumb_PhotoStrippedSize, 5) as score
FROM document1 d
JOIN message1 m ON m.id = d.message_id
JOIN channel1 ch ON ch.id = m.channel_id
WHERE compare_PhotoStrippedSize('[1, 22, 40, 197, 162, 138, 40, 0, 162, 138, 40, 0, 162, 138, 40, 0, 162, 138, 40, 0, 162, 138, 40, 0, 162, 138, 40, 3]', d.tg_thumb_PhotoStrippedSize, 5) <= 4;
```