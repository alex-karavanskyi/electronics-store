import { Component, type ReactNode } from 'react'
import styles from './RequestError.module.scss'

type Props = { children: ReactNode; message: string; resetKey: string }
type State = { failed: boolean; resetKey: string }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false, resetKey: this.props.resetKey }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  static getDerivedStateFromProps(props: Props, state: State) {
    return props.resetKey === state.resetKey
      ? null
      : { failed: false, resetKey: props.resetKey }
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className={styles.notice} role="alert">
        <p>{this.props.message}</p>
        <button type="button" onClick={() => window.location.reload()}>
          Reload page
        </button>
      </div>
    )
  }
}
