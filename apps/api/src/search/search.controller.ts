import { Controller, Get, Post, Query } from '@nestjs/common';
import { SearchService, type SearchSort } from './search.service';

@Controller('v1/search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(
    @Query('q') q?: string,
    @Query('city') city?: string,
    @Query('state') state?: string,
    @Query('premium') premium?: string,
    @Query('featured') featured?: string,
    @Query('verificado') verificado?: string,
    @Query('verified') verified?: string,
    @Query('preferencia') preferencia?: string,
    @Query('posicao') posicao?: string,
    @Query('position') position?: string,
    @Query('bairro') bairro?: string,
    @Query('neighborhood') neighborhood?: string,
    @Query('tag') tag?: string,
    @Query('ordenar') ordenar?: string,
    @Query('sort') sort?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const sortValue = (ordenar ?? sort) as SearchSort | undefined;
    const verifiedFilter = verificado === 'true' || verified === 'true';

    return this.searchService.search(q ?? '', {
      city,
      state,
      premium: premium === 'true',
      featured: featured === 'true',
      verified: verifiedFilter,
      preference: preferencia,
      position: posicao ?? position,
      neighborhood: bairro ?? neighborhood,
      tag,
      sort: sortValue,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Post('reindex')
  reindex() {
    return this.searchService.reindexAll();
  }
}
