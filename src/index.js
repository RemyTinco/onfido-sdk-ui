
import { h, render, Component } from 'preact'
import { Provider as ReduxProvider } from 'react-redux'
import EventEmitter from 'eventemitter2'
import { getCountryCodes } from 'react-phone-number-input/modules/countries'
import labels from 'react-phone-number-input/locale/default.json'

import { fetchUrlsFromJWT } from '~utils/jwt'
import { store, actions } from './core'
import Modal from './components/Modal'
import Router from './components/Router'
import * as Tracker from './Tracker'
import { LocaleProvider } from './locales'
import { upperCase } from '~utils/string'
import { enabledDocuments } from './components/Router/StepComponentMap'

const events = new EventEmitter()

Tracker.setUp()

const ModalApp = ({ options:{ useModal, isModalOpen, onModalRequestClose, containerId, shouldCloseOnOverlayClick, ...otherOptions}, ...otherProps }) =>
  <Modal useModal={useModal} isOpen={isModalOpen} onRequestClose={onModalRequestClose} containerId={containerId} shouldCloseOnOverlayClick={shouldCloseOnOverlayClick}>
    <Router options={otherOptions} {...otherProps}/>
  </Modal>

class Container extends Component {
  componentDidMount() {
    this.prepareInitialStore(this.props.options)
  }

  componentDidUpdate(prevProps) {
    this.prepareInitialStore(this.props.options, prevProps.options)
  }

  prepareInitialStore = (options = {}, prevOptions = {}) => {
    const { userDetails: { smsNumber } = {}, steps} = options
    const { userDetails: { smsNumber: prevSmsNumber } = {}, steps: prevSteps } = prevOptions

    if (smsNumber && smsNumber !== prevSmsNumber) {
      actions.setMobileNumber(smsNumber)
    }

    if (steps && steps !== prevSteps) {
      const enabledDocs = enabledDocuments(steps)
      if (enabledDocs.length === 1) {
        actions.setIdDocumentType(enabledDocs[0])
      }
    }
  }

  render() {
    const { options } = this.props

    return (
      <ReduxProvider store={store}>
        <LocaleProvider language={options.language}>
          <ModalApp options={options} />
        </LocaleProvider>
      </ReduxProvider>
    )
  }
}

/**
 * Renders the Onfido component
 *
 * @param {DOMelement} [merge] preact requires the element which was created from the first render to be passed as 3rd argument for a rerender
 * @returns {DOMelement} Element which was generated from render
 */
const onfidoRender = (options, el, merge) =>
  render( <Container options={options}/>, el, merge)

const trackOnComplete = () => Tracker.sendEvent('completed flow')
events.on('complete', trackOnComplete)

const bindEvents = ({onComplete, onError}) => {
  events.on('complete', onComplete)
  events.on('error', onError)
}

const rebindEvents = (oldOptions, newOptions) => {
  events.off('complete', oldOptions.onComplete)
  events.off('error', oldOptions.onError)
  bindEvents(newOptions)
}

const noOp = ()=>{}

const defaults = {
  token: undefined,
  urls: {
    onfido_api_url: `${process.env.ONFIDO_API_URL}`,
    telephony_url: `${process.env.SMS_DELIVERY_URL}`,
    hosted_sdk_url: `${process.env.MOBILE_URL}`,
    detect_document_url: `${process.env.ONFIDO_SDK_URL}`,
    sync_url: `${process.env.DESKTOP_SYNC_URL}`
  },
  containerId: 'onfido-mount',
  onComplete: noOp,
  onError: noOp
}

const isStep = val => typeof val === 'object'
const formatStep = typeOrStep => isStep(typeOrStep) ?  typeOrStep : {type:typeOrStep}

const formatOptions = ({steps, smsNumberCountryCode, ...otherOptions}) => ({
  ...otherOptions,
  urls: jwtUrls(otherOptions),
  smsNumberCountryCode: validateSmsCountryCode(smsNumberCountryCode),
  steps: (steps || ['welcome','document','face','complete']).map(formatStep)
})

const experimentalFeatureWarnings = ({steps}) => {
  const isDocument = (step) => step.type === 'document'
  const documentStep = steps.find(isDocument)
  const isUseWebcamOptionEnabled = documentStep && documentStep.options && documentStep.options.useWebcam
  if (isUseWebcamOptionEnabled) {
    console.warn("`useWebcam` is an experimental option and is currently discouraged")
  }
  const isLiveDocumentCaptureEnabled = documentStep && documentStep.options && documentStep.options.useLiveDocumentCapture
  if (isLiveDocumentCaptureEnabled) {
    console.warn("`useLiveDocumentCapture` is a beta feature and is still subject to ongoing changes")
  }
}

const isSMSCountryCodeValid = (smsNumberCountryCode) => {
  // If you need to refactor this code, remember not to introduce large libraries such as
  // libphonenumber-js in the main bundle!
  const countries = getCountryCodes(labels)
  const isCodeValid = countries.includes(smsNumberCountryCode)
  if (!isCodeValid) {
    console.warn("`smsNumberCountryCode` must be a valid two-characters ISO Country Code. 'GB' will be used instead.")
  }
  return isCodeValid
}

const validateSmsCountryCode = (smsNumberCountryCode) => {
  if (!smsNumberCountryCode) return 'GB'
  const upperCaseCode = upperCase(smsNumberCountryCode)
  return isSMSCountryCodeValid(upperCaseCode) ? upperCaseCode : 'GB'
}

const onInvalidJWT = () => {
  const type = 'exception'
  const message = 'Invalid token'
  events.emit('error', { type, message })
}

const jwtUrls = ({token}) => {
  const urls = token && fetchUrlsFromJWT(token, onInvalidJWT)
  return {...defaults.urls, ...urls}
}

export const init = (opts) => {
  console.log("onfido_sdk_version", process.env.SDK_VERSION)
  Tracker.install()
  const options = formatOptions({ ...defaults, ...opts, events })
  experimentalFeatureWarnings(options)

  bindEvents(options)

  const containerEl = document.getElementById(options.containerId)
  const element = onfidoRender(options, containerEl)

  return {
    options,
    element,
    /**
     * Does a merge with previous options and rerenders
     *
     * @param {Object} changedOptions shallow diff of the initialised options
     */
    setOptions (changedOptions) {
      const oldOptions = this.options
      this.options = formatOptions({...this.options,...changedOptions});
      if (!this.options.token) { onInvalidJWT() }
      rebindEvents(oldOptions, this.options);
      this.element = onfidoRender( this.options, containerEl, this.element )
      return this.options;
    },

    tearDown() {
      const { socket } = store.getState().globals
      socket && socket.close()
      actions.reset()
      events.removeAllListeners('complete', 'error')
      render(null, containerEl, this.element)
      Tracker.uninstall()
    }
  }
}
