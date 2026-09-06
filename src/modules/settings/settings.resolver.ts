import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { RolesExact } from '../../common/decorators/roles.decorator';
import { GqlJwtAuthGuard } from '../../modules/auth/guards/gql-jwt-auth.guard';
import { UserRole } from '@prisma/client';
import { SettingsService } from './settings.service';
import { Setting } from './entities/setting.entity';
import { UpsertSettingInput } from './dto/setting.dto';

@Resolver(() => Setting)
export class SettingsResolver {
  constructor(private readonly settingsService: SettingsService) {}

  @UseGuards(GqlJwtAuthGuard)
  @RolesExact(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  @Query(() => [Setting])
  async settings(
    @Args('keys', { type: () => [String], nullable: true }) keys?: string[],
  ): Promise<Setting[]> {
    return this.settingsService.findAll({ keys });
  }

  @UseGuards(GqlJwtAuthGuard)
  @RolesExact(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  @Query(() => Setting, { nullable: true })
  async setting(@Args('key') key: string): Promise<Setting | null> {
    return this.settingsService.findByKey(key);
  }

  @UseGuards(GqlJwtAuthGuard)
  @RolesExact(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  @Mutation(() => Setting)
  async upsertSetting(
    @Args('input') input: UpsertSettingInput,
  ): Promise<Setting> {
    return this.settingsService.upsert(input);
  }

  @UseGuards(GqlJwtAuthGuard)
  @RolesExact(UserRole.SUPER_ADMIN)
  @Mutation(() => Boolean)
  async deleteSetting(@Args('key') key: string): Promise<boolean> {
    try {
      await this.settingsService.remove(key);
      return true;
    } catch {
      return false;
    }
  }
}
