/**
 * ChoiceButtons component - displays story choice options.
 */

import { Sparkles } from 'lucide-react';
import type { StoryChoice, StoryNode } from '../../lib/database.types';

export interface ChoiceWithNode extends StoryChoice {
  to_node: StoryNode;
}

interface ChoiceButtonsProps {
  choices: ChoiceWithNode[];
  selectedChoiceId?: string;
  onSelectChoice: (choice: ChoiceWithNode) => void;
  disabled?: boolean;
}

export function ChoiceButtons({
  choices,
  selectedChoiceId,
  onSelectChoice,
  disabled = false,
}: ChoiceButtonsProps) {
  if (choices.length === 0) return null;

  const hasSelected = selectedChoiceId !== undefined;

  return (
    <div className="space-y-4 mb-8">
      <div className="flex items-center gap-2 justify-center mb-6">
        <Sparkles className="w-5 h-5 text-yellow-500" />
        <h3 className="text-xl font-semibold text-gray-700">What should happen next?</h3>
        <Sparkles className="w-5 h-5 text-yellow-500" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {choices.map((choice) => {
          const isSelected = selectedChoiceId === choice.id;
          const isDisabled = hasSelected || disabled;

          return (
            <button
              key={choice.id}
              onClick={() => onSelectChoice(choice)}
              disabled={isDisabled}
              className={`group relative bg-white rounded-2xl p-6 text-left transition-all duration-300 shadow-lg ${
                isSelected
                  ? 'ring-4 ring-green-400 scale-105'
                  : isDisabled
                  ? 'opacity-30'
                  : 'hover:scale-105 hover:ring-4 hover:ring-blue-300 hover:shadow-2xl'
              }`}
            >
              {/* Selected state background */}
              {isSelected && (
                <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl" />
              )}

              {/* Hover state background */}
              {!isDisabled && !isSelected && (
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              )}

              <div className="relative">
                <p className="text-lg font-semibold text-gray-800 mb-2">
                  {choice.choice_text}
                </p>
                {choice.consequence_hint && (
                  <p className="text-sm text-gray-600 italic">
                    💭 {choice.consequence_hint}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
