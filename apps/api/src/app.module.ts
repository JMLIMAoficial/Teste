import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AdminModule } from './admin/admin.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AuthModule } from './auth/auth.module';
import { CommentsModule } from './comments/comments.module';
import { CommonModule } from './common/common.module';
import { CompanionModule } from './companion/companion.module';
import { EmailModule } from './email/email.module';
import { HealthModule } from './health/health.module';
import { LikesModule } from './likes/likes.module';
import { MediaModule } from './media/media.module';
import { MomentsModule } from './moments/moments.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PhotosModule } from './photos/photos.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProfilesModule } from './profiles/profiles.module';
import { RankingsModule } from './rankings/rankings.module';
import { RedisModule } from './redis/redis.module';
import { ReviewsModule } from './reviews/reviews.module';
import { SearchModule } from './search/search.module';
import { SeoModule } from './seo/seo.module';
import { StorageModule } from './storage/storage.module';
import { TagsModule } from './tags/tags.module';
import { MessagingModule } from './messaging/messaging.module';
import { PremiumModule } from './premium/premium.module';
import { PlatformModule } from './platform/platform.module';
import { VerificationModule } from './verification/verification.module';
import { ReportsModule } from './reports/reports.module';
import { VideosModule } from './videos/videos.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
    }),
    EventEmitterModule.forRoot(),
    PrismaModule,
    RedisModule,
    CommonModule,
    StorageModule,
    SearchModule,
    AnalyticsModule,
    EmailModule,
    NotificationsModule,
    HealthModule,
    AuthModule,
    ProfilesModule,
    CompanionModule,
    AdminModule,
    PhotosModule,
    MediaModule,
    VideosModule,
    MomentsModule,
    CommentsModule,
    ReviewsModule,
    LikesModule,
    RankingsModule,
    SeoModule,
    TagsModule,
    PlatformModule,
    PremiumModule,
    MessagingModule,
    VerificationModule,
    ReportsModule,
  ],
})
export class AppModule {}
