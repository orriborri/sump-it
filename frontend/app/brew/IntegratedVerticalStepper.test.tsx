import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { IntegratedVerticalStepper } from './IntegratedVerticalStepper';

const steps = ['Equipment', 'Parameters', 'Brew'];

function renderAt(activeStep: number) {
  render(
    <IntegratedVerticalStepper
      steps={steps}
      activeStep={activeStep}
      getStepInstructions={(index) => ({
        title: `Title ${index}`,
        description: `Description ${index}`,
      })}
      getStepContent={(index) => <div>Content {index}</div>}
    />
  );
}

describe('IntegratedVerticalStepper', () => {
  it('renders the active step instructions, content and current chip', () => {
    renderAt(1);
    // Active step shows its instructions and content.
    expect(screen.getByText('Title 1')).toBeInTheDocument();
    expect(screen.getByText('Description 1')).toBeInTheDocument();
    expect(screen.getByText('Content 1')).toBeInTheDocument();
    expect(screen.getByText('Current Step')).toBeInTheDocument();
  });

  it('marks earlier steps completed with a check and summary', () => {
    renderAt(2);
    // Steps 0 and 1 are completed, so two "Completed" chips appear.
    expect(screen.getAllByText('Completed')).toHaveLength(2);
    // Completed steps show their summary line with a check prefix.
    expect(screen.getByText('✓ Title 0')).toBeInTheDocument();
    expect(screen.getByText('✓ Title 1')).toBeInTheDocument();
  });

  it('shows every step label', () => {
    renderAt(0);
    for (const label of steps) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });
});
