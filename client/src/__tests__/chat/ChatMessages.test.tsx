import { render, screen } from '@testing-library/react'
import type { UIMessage } from 'ai'

import ChatMessages from '@/components/chat/ChatMessages'

beforeEach(() => {
  HTMLElement.prototype.scrollIntoView = jest.fn()
})

it.each(['text', 'reasoning'] as const)(
  'keeps the cursor on the last assistant message with a streaming %s part',
  type => {
    const messages: UIMessage[] = [
      {
        id: 'previous',
        role: 'assistant',
        parts: [{ type, text: 'Previous answer', state: 'streaming' }],
      },
      {
        id: 'reply',
        role: 'assistant',
        parts: [
          { type: 'step-start' },
          { type, text: 'Current answer', state: 'streaming' },
        ],
      },
    ]
    const { container, rerender } = render(
      <ChatMessages messages={messages} isResponding={false} />
    )

    expect(
      screen
        .getByText('Previous answer')
        .parentElement?.querySelector('.cursor')
    ).toBeNull()
    expect(screen.getByText('Current answer')).toBeVisible()
    expect(
      screen.getByText('Current answer').parentElement?.querySelector('.cursor')
    ).not.toBeNull()
    expect(container.querySelectorAll('.cursor')).toHaveLength(1)

    rerender(
      <ChatMessages
        messages={[
          messages[0],
          {
            ...messages[1],
            parts: [{ type, text: 'Current answer', state: 'done' }],
          },
        ]}
        isResponding={false}
      />
    )
    expect(container.querySelector('.cursor')).toBeNull()
  }
)
