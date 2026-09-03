import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class SelectOption {
  @Field()
  value!: string;

  @Field()
  label!: string;
}

@ObjectType()
export class CampaignOptions {
  @Field(() => [SelectOption])
  partners!: SelectOption[];

  @Field(() => [SelectOption])
  currencies!: SelectOption[];

  @Field(() => [SelectOption])
  categories!: SelectOption[];

  @Field(() => [String])
  trafficTypes!: string[];
}
