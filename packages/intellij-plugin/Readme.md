# IntelliJ plugin

Attempts to show the stryker mutations in IntelliJ IDE's 

## Work in progress

The current state of this plugin is just an experiment to get an inspection for each mutation in a source file.

## LivePlugin

The experiment leverages the [LivePlugin](https://plugins.jetbrains.com/plugin/7282-liveplugin)

To execute the plugin.kts 

- open the [example](./go-source-example) in [GoLand](https://www.jetbrains.com/go/)
- install the live plugin. 
- add a new `kotlin` plugin and copy paste the [experiment](live-plugin-experiments/plugin.kts)
in the plugin.kts file.
- start the plugin
- open [code.go](go-source-example/app/example/src/code.go)
- add a newline at the end of the file to trigger the HasMutationInspection

