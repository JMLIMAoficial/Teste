import { Controller, Get, Param } from '@nestjs/common';
import { TagsService } from './tags.service';

@Controller('v1')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get('tags')
  listTags() {
    return this.tagsService.listTags();
  }

  @Get('categorias/:slug')
  getCategory(@Param('slug') slug: string) {
    return this.tagsService.getBySlug(slug);
  }

  @Get('cidades')
  listCities() {
    return this.tagsService.listCities();
  }

  @Get('cidades/:slug')
  getCity(@Param('slug') slug: string) {
    return this.tagsService.getCityBySlug(slug);
  }
}
