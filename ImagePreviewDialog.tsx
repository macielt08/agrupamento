import { Dialog, DialogContent, DialogDescription } from '@/components/ui/dialog';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ImagePreviewDialogProps = {
  open: boolean;
  onClose: () => void;
  imageUrl: string;
  elementName: string;
};

export default function ImagePreviewDialog({ open, onClose, imageUrl, elementName }: ImagePreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl" aria-describedby={undefined}>
        <DialogDescription className="sr-only">
          Pré-visualização da imagem de {elementName}
        </DialogDescription>
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute -top-2 -right-2 z-10"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">{elementName}</h3>
            <img
              src={imageUrl}
              alt={elementName}
              className="w-full h-auto rounded-lg"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
