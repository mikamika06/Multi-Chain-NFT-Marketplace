import { Args, Query, Resolver } from '@nestjs/graphql';
import { Collection } from './entities/collection.entity';
import { CollectionsService } from './collections.service';
import { CollectionFilterInput } from './dto/collection-filter.input';

@Resolver(() => Collection)
export class CollectionsResolver {
  constructor(private readonly collectionsService: CollectionsService) {}

  @Query(() => [Collection], { name: 'collections' })
  async getCollections(
    @Args({ name: 'filter', type: () => CollectionFilterInput, nullable: true }) filter?: CollectionFilterInput,
  ): Promise<Collection[]> {
    return this.collectionsService.findAll(filter);
  }
}
