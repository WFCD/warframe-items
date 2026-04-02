declare module 'image-downloader' {
  interface Options {
    url: string;
    dest: string;
  }

  interface DownloadResult {
    filename: string;
    image: string;
  }

  export function image(options: Options): Promise<DownloadResult>;

  const imageDownloader: {
    image: (options: Options) => Promise<DownloadResult>;
  };

  export default imageDownloader;
}
