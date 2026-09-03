import { registerAs } from '@nestjs/config';
import { toBoolean } from './env.utils';

const graphqlConfig = registerAs('graphql', () => ({
  path: process.env.GRAPHQL_PATH ?? '/graphql',
  introspection: toBoolean(process.env.GRAPHQL_INTROSPECTION),
}));

export default graphqlConfig;
