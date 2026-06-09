import { type FormEvent, type RefObject, useRef, useState } from 'react';
import AvatarEditor, { type AvatarEditorRef } from 'react-avatar-editor';
import { Check, ImagePlus, Loader2, Trash2, X } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import type { WAAccount } from '../proto/byte/v/forge/waapp/v1/profile';
import { removeWaAccountProfilePicture, setWaAccountProfilePicture } from './wa-api';
import { WhatsAppIcon } from './wa-brand-icon';
import { Button, Input } from './ui';

const maxProfilePictureBytes = 2 * 1024 * 1024;

type Props = {
  account: WAAccount;
  onDone: (message: string) => void;
  onError: (message: string) => void;
};

export function WaAccountProfileSettings({ account, onDone, onError }: Props) {
  const [picture, setPicture] = useState<File | null>(null);
  const [activePicture, setActivePicture] = useState('');
  const [pictureReady, setPictureReady] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const editor = useRef<AvatarEditorRef>(null);
  const resetPictureSelection = () => {
    setPicture(null);
    setPictureReady(false);
    if (fileInput.current) fileInput.current.value = '';
  };
  const handleError = (error: unknown) => onError(error instanceof Error ? error.message : String(error));
  const pictureMutation = useMutation({
    mutationFn: async () => {
      if (!picture) throw new Error('请选择头像图片');
      if (picture.size > maxProfilePictureBytes) throw new Error('头像图片不能超过 2 MiB');
      if (!pictureReady) throw new Error('头像图片仍在加载');
      const dataURL = avatarDataURL(editor.current);
      const response = await setWaAccountProfilePicture(account, { image_base64: dataURLBase64(dataURL), content_type: 'image/jpeg' });
      return { dataURL, response };
    },
    onSuccess: ({ dataURL, response }) => {
      setActivePicture(dataURL);
      resetPictureSelection();
      onDone(response.profile_picture_id ? '头像已提交' : '头像请求已提交');
    },
    onError: handleError,
  });
  const removeMutation = useMutation({
    mutationFn: () => removeWaAccountProfilePicture(account),
    onSuccess: () => { setActivePicture(''); resetPictureSelection(); onDone('头像移除请求已提交'); },
    onError: handleError,
  });
  const busy = pictureMutation.isPending || removeMutation.isPending;
  return (
    <section className="rounded-xl border border-border bg-card p-3">
      <div className="flex flex-wrap items-center gap-3">
        <form className="flex items-center gap-2" onSubmit={(event) => submit(event, pictureMutation.mutate)}>
          <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-muted/60">
            {picture ? <AvatarPreview editor={editor} image={picture} onReady={setPictureReady} onError={onError} /> : <StoredAvatar src={activePicture} />}
          </div>
          <Input ref={fileInput} className="hidden" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(event) => { setPicture(event.target.files?.[0] || null); setPictureReady(false); }} />
          <Button type="button" size="sm" variant="ghost" disabled={busy} title="选择头像" aria-label="选择头像" onClick={() => fileInput.current?.click()}><ImagePlus size={15} /></Button>
          <Button type="submit" size="sm" variant="ghost" disabled={busy || !picture || !pictureReady} title="提交头像" aria-label="提交头像">{pictureMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check size={15} />}</Button>
          {picture ? <Button type="button" size="sm" variant="ghost" disabled={busy} title="取消选择" aria-label="取消选择" onClick={resetPictureSelection}><X size={15} /></Button> : null}
          <Button type="button" size="sm" variant="ghost" className="text-destructive hover:text-destructive" disabled={busy} title="移除头像" aria-label="移除头像" onClick={() => removeMutation.mutate()}><Trash2 size={15} /></Button>
        </form>
      </div>
    </section>
  );
}

function StoredAvatar({ src }: { src: string }) {
  return src ? <img className="size-12 object-cover" src={src} alt="当前头像" /> : <WhatsAppIcon className="size-7" />;
}

function AvatarPreview({ editor, image, onReady, onError }: { editor: RefObject<AvatarEditorRef | null>; image: File; onReady: (ready: boolean) => void; onError: (message: string) => void }) {
  return (
    <AvatarEditor
      ref={editor}
      image={image}
      width={512}
      height={512}
      border={0}
      borderRadius={256}
      scale={1}
      backgroundColor="#ffffff"
      onLoadSuccess={() => onReady(true)}
      onLoadFailure={() => { onReady(false); onError('头像图片加载失败'); }}
      style={{ width: '3rem', height: '3rem' }}
    />
  );
}

function submit(event: FormEvent<HTMLFormElement>, run: () => void) {
  event.preventDefault();
  run();
}

function avatarDataURL(editor: AvatarEditorRef | null) {
  const dataURL = editor?.getImageScaledToCanvas().toDataURL('image/jpeg', 0.92);
  if (!dataURL) throw new Error('头像图片编码失败');
  return dataURL;
}

function dataURLBase64(dataURL: string) {
  return dataURL.slice(dataURL.indexOf(',') + 1);
}
