# Ugwisha

Ugwisha is the descendent of
[Ugwita](https://orbiit.github.io/gunn-web-app/lite/) and aims to simply be more
visually appealing and have more functionality than Ugwita (though still less
than [UGWA](https://orbiit.github.io/gunn-web-app/)); one of the major
complaints about Ugwita is its ugliness (it seems most people judge apps by
their appearance).

Feel free to fork this repository and make your own app; just credit me
somewhere.

## `ugwisha.js`

Ugwisha can be used for a different school. Before loading
[`ugwisha.js`](./ugwisha.js), run some JavaScript that defines a global JS
object `window.ugwishaOptions` that sets some parameters for Ugwisha. You can
see what options you need to specify for Ugwisha in
[`js/ugwisha-options.js`](js/ugwisha-options.js) and how they are used in
[`js/gunn.js`](./js/gunn.js).

## Developing

While developing, you can use
[`http-server`](https://www.npmjs.com/package/http-server) to locally host
Ugwisha. Like UGWA, Ugwisha's source code works directly in the browser; open
http://localhost:8080/ugwisha/src.html?no-sw to test Ugwisha while modifying its
code.

When you're done, bundle everything together by doing

```sh
npm run build
```

It outputs a version number which you can use for [psa.html](./psa.html) to
avoid showing the PSA before the user receives the update.

## Features

Ugwisha currently supports:

- features all Gunn apps have:
  - working offline
  - time until next period in tab title
  - alternate schedules
  - previewing other days
- UGWA features:
  - custom period names and colours
  - PSA system
  - optional SELF
  - week previews
  - events
  - barcode generator
  - proper date selector
  - proper colour picker
  - club and staff lists
- Ugwita features
  - automatically change date when there's a new day
  - linking to dates by URL: `?day=yyyy-mm-dd`
- unique features:
  - better design than Ugwita
  - nature, custom, or gradient backgrounds that work offline
  - time until next period in favicon (so Ugwisha can be pinned)
  - split double flex
  - remove passing periods from brunch/lunch
  - randomly selected sheep doodles

Perhaps Ugwisha may also support:

- period descriptions
- zero, H, and staff periods support
- weather
- campus map

## Etymology of "Ugwisha"

`Ugwisha` (**/uˈɡwɪʃa/** or **/uˈɡwiʃa/**) is a portmanteau of `Ugwita`
(`Ugwa`&mdash;an alternative letter case form of `UGWA`, which stands for
`Unofficial Gunn Web App`&mdash;with the Spanish feminine diminutive `-ita`) and
`-ish` because of how Ugwisha is not as functional... *ish*.
