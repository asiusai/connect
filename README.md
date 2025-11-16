# connect

connect is the web and mobile experience for [openpilot](https://github.com/commaai/openpilot).

Try it out at https://612.connect-d5y.pages.dev.

## Development

## Install bun with

```bash
curl -fsSL https://bun.com/install | bash
```

## Clone, install and run

```bash
git clone https://github.com/commaai/new-connect.git

cd connect
bun install  
bun dev
```

## Roadmap

Once we've shipped v1, next up will be:
* [Sentry mode](https://www.youtube.com/watch?v=laO0RzsDzfU)
* SSH console for openpilot developers
* Replace snapshot with a live stream
* openpilot clips, like this [community tool](https://github.com/nelsonjchen/op-replay-clipper)
* Manage the settings on your comma 3X
* Car mangement: lock doors, EV charge status, etc.
