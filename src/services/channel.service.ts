import { Channel1 } from "../entity/Channel1";
import { AppDataSource } from "../data-source";
import { sortBy as __sortBy } from "lodash";

interface GetChannelIdsOptions { groups?: number[] }
const getChannelIds = async (options?: GetChannelIdsOptions): Promise<Channel1[]> => {
  const { groups } = options;
  // const channels = await AppDataSource.manager.find(Channel1);
  // return __sortBy(channels.filter(ch => ch.active && group.includes(ch.channel_group)), ["name"]);
  const queryText = `
    SELECT ch.*, COUNT(m.channel_id) as count
    FROM channel1 ch
    INNER JOIN message1 m ON m.channel_id = ch.id
    GROUP BY ch.id
    ORDER BY count;
  `;
  let channels = await AppDataSource.manager.query(queryText) as Channel1[];
  channels = channels.filter(ch => ch.active && groups.includes(ch.channel_group));
  return channels;
};

export interface ChannelStats { id: number, name: string; last_tg_id: number; number_posts: number; }
const getChannelStats = async (): Promise<ChannelStats[]> => {
  const queryText = `
    SELECT
      ch1.id,
      ch1.name,
      MAX(m1.tg_id) as last_tg_id,
      COUNT(m1.channel_id) as number_posts
    FROM message1 m1
    JOIN channel1 ch1 ON ch1.id = m1.channel_id
    GROUP BY m1.channel_id
    UNION
    SELECT
      ch2.id,
      ch2.name,
      0 as last_tg_id,
      0 as number_posts
    FROM channel1 ch2
    LEFT JOIN message1 m2 ON ch2.id = m2.channel_id
    WHERE m2.channel_id IS NULL
    ORDER BY name;
  `;
  const channelStats = await AppDataSource.manager.query(queryText);
  return channelStats as ChannelStats[];
};

export default {
  getChannelIds,
  getChannelStats,
};