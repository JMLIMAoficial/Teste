import Image, { type ImageProps } from "next/image";

type OptimizedImageProps = Omit<ImageProps, "src" | "alt"> & {
  src: string;
  alt?: string;
};

export function OptimizedImage({ src, alt = "", ...props }: OptimizedImageProps) {
  return <Image src={src} alt={alt} {...props} />;
}
