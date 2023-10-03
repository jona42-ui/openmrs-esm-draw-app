![Node.js CI](https://github.com/openmrs/openmrs-esm-draw-app/workflows/Node.js%20CI/badge.svg)

# OpenMRS ESM Draw app

This is an OpenMRS frontend module for annotating clinical images. It is built using the [O3 Framework](https://o3-docs.vercel.app/docs) and leverages the [react-image-annotate](https://github.com/UniversalDataTool/react-image-annotate) library.

Read the related [OpenMRS Talk post](https://talk.openmrs.org/t/gsoc-2023-o3-draw-on-body-diagram-app-project-updates-discussion/39544) for some background on this project.

## Running this code

```sh
yarn  # to install dependencies
yarn start  # to run the dev server
```

Once it is running, a browser window should open with the OpenMRS 3 application. Log in and then navigate to
`/openmrs/spa/draw`.
