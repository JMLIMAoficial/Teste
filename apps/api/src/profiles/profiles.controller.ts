import { BadRequestException, Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { ProfilesService } from './profiles.service';

@Controller('v1/profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get()
  list() {
    return this.profilesService.listPublic();
  }

  @Get('nearby')
  listNearby(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius?: string,
    @Query('limit') limit?: string,
  ) {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      throw new BadRequestException('Parâmetros lat e lng são obrigatórios');
    }

    return this.profilesService.listNearby(
      latitude,
      longitude,
      radius ? parseFloat(radius) : 150,
      limit ? parseInt(limit, 10) : 12,
    );
  }

  @Get(':slug/similar')
  listSimilar(@Param('slug') slug: string, @Query('limit') limit?: string) {
    return this.profilesService.listSimilar(slug, limit ? parseInt(limit, 10) : 8);
  }

  @Get(':slug')
  async getBySlug(@Param('slug') slug: string, @Query('sessionId') sessionId?: string) {
    const profile = await this.profilesService.getBySlug(slug, sessionId);

    if (!profile) {
      throw new NotFoundException('Perfil não encontrado');
    }

    return profile;
  }
}
