import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../common/auth.types';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
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
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    const parsedOffset = offset ? parseInt(offset, 10) : undefined;

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
      limit:
        parsedLimit && Number.isFinite(parsedLimit)
          ? Math.min(Math.max(parsedLimit, 1), 50)
          : undefined,
      offset:
        parsedOffset && Number.isFinite(parsedOffset)
          ? Math.max(parsedOffset, 0)
          : undefined,
    });
  }

  @Post('reindex')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  reindex() {
    return this.searchService.reindexAll();
  }
}
