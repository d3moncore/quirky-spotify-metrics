
import React from 'react';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ActionButtonProps {
  label: string;
  onClick: () => void;
  external?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({ label, onClick, external }) => {
  return (
    <Button
      onClick={onClick}
      variant="outline"
      className="w-full h-full min-h-[80px] flex flex-col items-center justify-center gap-2 hover:bg-secondary/70 hover-scale"
    >
      <span className="text-sm font-medium">{label}</span>
      {external ? (
        <ExternalLink className="h-4 w-4 text-muted-foreground" />
      ) : null}
    </Button>
  );
};

export default ActionButton;
