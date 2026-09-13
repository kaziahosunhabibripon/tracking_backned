import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { RolesExact } from '../../common/decorators/roles.decorator';
import { GqlJwtAuthGuard } from '../../modules/auth/guards/gql-jwt-auth.guard';
import { UserRole } from '@prisma/client';
import { NotFoundException } from '../../common/errors/app.exception';
import { CrOptimizerService } from './cr-optimizer.service';
import { CrExperiment } from './entities/cr-experiment.entity';
import {
  CreateCrExperimentInput,
  UpdateCrExperimentInput,
} from './dto/cr-experiment.dto';

@Resolver(() => CrExperiment)
export class CrOptimizerResolver {
  constructor(private readonly crOptimizerService: CrOptimizerService) {}

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => [CrExperiment])
  async crExperiments(@Args('offerId') offerId: string) {
    return this.crOptimizerService.findByOffer(offerId);
  }

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => CrExperiment)
  async crExperiment(@Args('id') id: string) {
    const experiment = await this.crOptimizerService.findOne(id);
    if (!experiment) throw new NotFoundException('CR experiment not found.');
    return experiment;
  }

  @UseGuards(GqlJwtAuthGuard)
  @RolesExact(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  @Mutation(() => CrExperiment)
  async createCrExperiment(@Args('input') input: CreateCrExperimentInput) {
    return this.crOptimizerService.create(input);
  }

  @UseGuards(GqlJwtAuthGuard)
  @RolesExact(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  @Mutation(() => CrExperiment)
  async updateCrExperiment(
    @Args('id') id: string,
    @Args('input') input: UpdateCrExperimentInput,
  ) {
    return this.crOptimizerService.update(id, input);
  }

  @UseGuards(GqlJwtAuthGuard)
  @RolesExact(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.STAFF,
  )
  @Mutation(() => Boolean)
  async deleteCrExperiment(@Args('id') id: string) {
    await this.crOptimizerService.remove(id);
    return true;
  }
}
