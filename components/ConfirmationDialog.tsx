'use client';

import { ParsedPiece } from '@/types';
import { formatPieceForConfirmation } from '@/lib/musicParser';

interface ConfirmationDialogProps {
  piece: ParsedPiece;
  onConfirm: (confirmed: boolean, allMovements?: boolean) => void;
}

export default function ConfirmationDialog({ piece, onConfirm }: ConfirmationDialogProps) {
  const formattedPiece = formatPieceForConfirmation(piece);
  const isSymphonyWithoutMovement = piece.work.toLowerCase().includes('symphony') && !piece.movement;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-semibold mb-4">Please confirm</h3>
        <p className="text-gray-700 mb-4">
          Just to confirm — do you mean <span className="font-medium">{formattedPiece}</span>?
        </p>
        
        {isSymphonyWithoutMovement && (
          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-4">
              Would you like all movements of this symphony, or just a specific movement?
            </p>
            <div className="space-y-3">
              <button
                onClick={() => onConfirm(true, true)}
                className="w-full btn-primary text-left px-4 py-3"
              >
                All movements
              </button>
              <button
                onClick={() => onConfirm(true, false)}
                className="w-full btn-secondary text-left px-4 py-3"
              >
                Let me specify a movement
              </button>
            </div>
          </div>
        )}
        
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => onConfirm(false)}
            className="btn-secondary"
          >
            No, let me try again
          </button>
          {!isSymphonyWithoutMovement && (
            <button
              onClick={() => onConfirm(true)}
              className="btn-primary"
            >
              Yes, that's correct
            </button>
          )}
        </div>
      </div>
    </div>
  );
}