import { useState } from 'react';

interface SquareIconProps {
  src?: string;
  emoji: string;
  className: string;
}

/**
 * 盤面マス・節目マスのアイコン表示。画像素材があればそれを使い、
 * 読み込みに失敗した場合（またはそもそも画像が割り当てられていない場合）は
 * 既存の絵文字へ安全にフォールバックする。
 */
function SquareIcon({ src, emoji, className }: SquareIconProps) {
  const [imageFailed, setImageFailed] = useState(false);

  if (src && !imageFailed) {
    return (
      <img
        src={src}
        alt=""
        className={`${className} ${className}--image`}
        onError={() => setImageFailed(true)}
        draggable={false}
      />
    );
  }

  if (!emoji) return null;
  return <span className={className}>{emoji}</span>;
}

export default SquareIcon;
