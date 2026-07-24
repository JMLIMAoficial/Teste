import { Controller, Get, Header, Query } from '@nestjs/common';
import { SeoService } from './seo.service';

@Controller('v1/seo')
export class SeoController {
  constructor(private readonly seoService: SeoService) {}

  @Get('meta')
  meta(
    @Query('page') page: string,
    @Query('slug') slug?: string,
    @Query('name') name?: string,
    @Query('city') city?: string,
  ) {
    return this.seoService.getMeta(page ?? 'home', { slug, name, city });
  }

  @Get('schema')
  schema(
    @Query('page') page: string,
    @Query('slug') slug?: string,
    @Query('name') name?: string,
    @Query('city') city?: string,
    @Query('description') description?: string,
    @Query('imageUrl') imageUrl?: string,
  ) {
    return this.seoService.getSchema(page ?? 'home', {
      slug,
      name,
      city,
      description,
      imageUrl,
    });
  }

  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml')
  async sitemap() {
    return this.seoService.generateSitemap();
  }

  @Get('robots.txt')
  @Header('Content-Type', 'text/plain')
  robots() {
    return this.seoService.getRobotsTxt();
  }
}
