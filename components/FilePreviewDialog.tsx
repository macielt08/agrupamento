import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

type FilePreviewDialogProps = {
  open: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName?: string;
};

export default function FilePreviewDialog({ open, onClose, fileUrl, fileName = 'Ficheiro' }: FilePreviewDialogProps) {
  const isImage = fileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  const isPdf = fileUrl.match(/\.pdf$/i);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Pré-visualização do Ficheiro</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(fileUrl, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir
            </Button>
          </DialogTitle>
          <DialogDescription>
            Visualize o ficheiro anexado ao movimento.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 overflow-auto max-h-[70vh]">
          {isImage ? (
            <img 
              src={fileUrl} 
              alt={fileName}
              className="w-full h-auto rounded-lg"
            />
          ) : isPdf ? (
            <iframe
              src={fileUrl}
              className="w-full h-[70vh] rounded-lg border"
              title={fileName}
            />
          ) : (
            <div className="text-center p-8">
              <p className="text-muted-foreground mb-4">
                Não é possível pré-visualizar este tipo de ficheiro.
              </p>
              <Button
                onClick={() => window.open(fileUrl, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir Ficheiro
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
