import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class ReorderPhotosDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  photoIds!: string[];
}
