import { Channel1 } from "../entity/Channel1";
import { AppDataSource } from "../data-source";
import { sortBy as __sortBy } from "lodash";
import { ChannelGroups } from "../entity/ChannelGroup1";

interface GetChannelIdsOptions { groups?: number[] }
const getChannelIds = async (options?: GetChannelIdsOptions): Promise<Channel1[]> => {
  const { groups } = options;
  // const channels = await AppDataSource.manager.find(Channel1);
  // return __sortBy(channels.filter(ch => ch.active && group.includes(ch.channel_group)), ["name"]);

  const queryText = `
    SELECT ch.*, COUNT(m.channel_id) as count
    FROM channel1 ch
    LEFT JOIN message1 m ON m.channel_id = ch.id
    GROUP BY ch.id
    ORDER BY count;
  `;
  // don't forget that count will be a string
  let channels = await AppDataSource.manager.query(queryText) as Channel1[];
  channels = channels.filter(ch => ch.active && groups.includes(ch.channel_group));
  return channels;
};

export interface ChannelStats { id: number, name: string; last_tg_id: number; last_tg_date: number; number_posts: number; channel_group: ChannelGroups, aggregator: boolean, active: boolean }
const getChannelStats = async (): Promise<ChannelStats[]> => {
  const queryText = `
    SELECT
      ch1.id,
      ch1.name,
      MAX(m1.tg_id) as last_tg_id,
      MAX(m1.tg_date) as last_tg_date,
      COUNT(m1.channel_id) as number_posts,
      ch1.aggregator,
      ch1.channel_group,
      ch1.active
    FROM message1 m1
    JOIN channel1 ch1 ON ch1.id = m1.channel_id
    GROUP BY m1.channel_id
    UNION
    SELECT
      ch2.id,
      ch2.name,
      0 as last_tg_id,
      0 as last_tg_date,
      0 as number_posts,
      ch2.aggregator,
      ch2.channel_group,
      ch2.active
    FROM channel1 ch2
    LEFT JOIN message1 m2 ON ch2.id = m2.channel_id
    WHERE m2.channel_id IS NULL
    ORDER BY name;
  `;
  let channelStats = await AppDataSource.manager.query(queryText);
  channelStats = channelStats.map(st => {
    st.number_posts = parseInt(st.number_posts);
    st.aggregator = st.aggregator === 1 ? true : false;
    st.active = st.active === 1 ? true : false;
    return st;
  });
  return channelStats as ChannelStats[];
};

export default {
  getChannelIds,
  getChannelStats,
};