# Onfido JS SDK Migration Guide

The guides below are provided to ease the transition of existing applications using the Onfido SDK from one version to another that introduces breaking API changes.

## `5.0.0` -> `5.6.0`
With release 5.6.0 there is a breaking change that will affect integrators with customised languages or UI copy.

**Note:** The string custom translation version scheme has changed, going forward if the strings translations change it will result in a MINOR version change, therefore you are responsible for testing your translated layout in case you are using custom translations or copy.

### Added strings

* `capture.switch_device`

### Removed strings

* `cross_device.switch_device.submessage`

### Changed strings

The **English** and **Spanish** copy for the following string(s) has changed:
* `capture.upload_file`
* `errors.invalid_size.message`
* `errors.invalid_size.instruction`

The **English** copy for the following string(s) has changed:
* `capture.driving_licence.front.title`
* `capture.driving_licence.back.title`
* `capture.national_identity_card.front.title`
* `capture.national_identity_card.back.title`
* `capture.passport.front.title`
* `capture.bank_building_society_statement.front.title`
* `capture.utility_bill.front.title`
* `capture.benefit_letters.front.title`
* `capture.council_tax.front.title`
* `errors.invalid_type.message`
* `errors.invalid_type.instruction`

## `4.0.0` -> `5.0.0`

We have changed the behaviour of the document step. If the document step is initialised with only one document type, the document selector screen will not be displayed. If your application relies on the document selector screen, even if you are picking only one document, you will have to implement that UI yourself.

## `3.1.0` -> `4.0.0`

### Import breaking changes

We have changed how the SDK is exported, in order to reduce redundant transpiled code and to better trim dead code too. This led to a size reduction overall.

However, this has potentially created a breaking change for those consuming the SDK with an ES style of import. Classic window style import and commonjs require should work the same.

#### Example of old behaviour

```js
import Onfido from 'onfido-sdk-ui'

Onfido.init(...)
```

#### Example of new behaviour
```js
import {init} from 'onfido-sdk-ui'
init(...)
```

or

```js
import * as Onfido from 'onfido-sdk-ui'
Onfido.init(...)
```

### Style Breaking change

- We have internally changed the CSS units used in the SDK to be relative (`em`) units.

Therefore, if you previously set the font-size of `.onfido-sdk-ui-Modal-inner`, it is recommended that you remove this `font-size` override.

This is because we are looking to make the SDK compatible with `em`, but first we need to remove media queries which are not really compatible with that unit.

#### Example of old behaviour

```css
.onfido-sdk-ui-Modal-inner {
  font-size: 20px;
}
```

#### Example of new behaviour
```css
.a-more-specific-selector {
  font-size: 20px;
}
```

## `2.8.0` -> `3.0.0`

### Breaking changes

- Removed support for `buttonId`. From this version you will need to create a function that launches the SDK when a trigger element (ie a button) is clicked.

### Example of old behaviour
```html
<script>
    Onfido.init({
      useModal: true,
      buttonId: 'onfido-btn',
      token: 'YOUR_JWT_TOKEN',
      onComplete: function(data) {
        // callback for when everything is complete
        console.log("everything is complete")
      }
    });
</script>

<body>
  <button id='onfido-btn'>Verify identity</button>
  <div id='onfido-mount'></div>
</body>
```

### Example of new behaviour
```html
<script>
    var onfido = {}

    function triggerOnfido() {
      onfido = Onfido.init({
        useModal: true,
        isModalOpen: true,
        onModalRequestClose: function() {
          // Update options with the state of the modal
          onfido.setOptions({isModalOpen: false})
        },
        token: 'YOUR_JWT_TOKEN',
        onComplete: function(data) {
          // callback for when everything is complete
          console.log("everything is complete")
        }
      });
    };
</script>

<body>
  <!-- Use a button to trigger the Onfido SDK  -->
  <button onClick="triggerOnfido()">Verify identity</button>
  <div id='onfido-mount'></div>
</body>
```

## `1.1.0` -> `2.0.0`

### Breaking changes

- Removed `onDocumentCapture` that used to be fired when the document had been successfully captured, confirmed by the user and uploaded to the Onfido API
- Removed `onFaceCapture` callbacks that used to be fired when the face has beed successfully captured, confirmed by the user and uploaded to the Onfido API.
- Removed `getCaptures` function that used to return the document and face files captured during the flow.
- Changed the behaviour of `onComplete` callback. It used to return an object that contained all captures, now it doesn't return any data.

### Example of old behaviour

```js
Onfido.init({
  token: 'YOUR_JWT_TOKEN',
  containerId: 'onfido-mount',
  onDocumentCapture: function(data) {
    /*callback for when the*/ console.log("document has been captured successfully", data)
  },
  onFaceCapture: function(data) {
    /*callback for when the*/ console.log("face capture was successful", data)
  },
  onComplete: function(capturesHash) {
    console.log("everything is complete")
    // data returned by the onComplete callback including the document and face files captured during the flow
    console.log(capturesHash)
    // function that used to return the document and face files captured during the flow.
    console.log(Onfido.getCaptures())
  }
})
```

### Example of new behaviour

```js
Onfido.init({
  // the JWT token that you generated earlier on
  token: 'YOUR_JWT_TOKEN',
  // id of the element you want to mount the component on
  containerId: 'onfido-mount',
  onComplete: function() {
    console.log("everything is complete")
    // You can now trigger your backend to start a new check
  }
})
```
