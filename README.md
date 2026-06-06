# pi-nvidia-adapter

An intelligent, self-updating NVIDIA API provider adapter plugin for the [Pi Coding Agent](https://github.com/earendil-works/pi-coding-agent). 

It dynamically maps, groups, and registers 100+ frontier models available on the NVIDIA API platform (such as Kimi, GLM, DeepSeek R1, Qwen3, Llama 3.3, and more), offering out-of-the-box support for reasoning/thinking options, image input capabilities, and huge context windows.

---

## Features

- **Dynamic Auto-Discovery**: Automatically syncs with the latest NVIDIA models via a single command. No more outdated hardcoded configurations.
- **Intelligent Grouping & Sorting**: Models are clean-grouped by creator/company (e.g. Moonshot, Zhipu, DeepSeek, Meta, Google) with flagship providers pinned to the top and sorted by release freshness.
- **Robust Reasoning/Thinking Support**: Intercepts requests to inject model-specific reasoning kwargs (like `thinking: true` or `enable_thinking: true`) depending on the model family.
- **Automatic Metadata Integration**: Combines live NVIDIA models with detailed specifications (context windows, max outputs, visual modal support) compiled from the open-source **models.dev** database.
- **Runtime Fallback**: Newly launched models not yet in the offline registry will be dynamically detected at session startup and parsed using robust heuristic rules.

---

## Installation

### Method 1: Package Installation (Recommended)
Install the extension directly into your Pi Coding Agent:
```bash
pi install git:github.com/fangwangme/pi-nvidia-adapter
```

### Method 2: Local Installation (Development)
Clone the repository and load it locally:
```bash
# Clone the repository
git clone git@github.com:fangwangme/pi-nvidia-adapter.git

# Load the extension in Pi
pi -e ./path/to/pi-nvidia-adapter
```

---

## Setup & Credentials

Before using the plugin, you must configure a valid NVIDIA API Key. The extension will automatically resolve credentials in the following order:

1. **Environment Variables**: Checks `NVIDIA_API_KEY`, falling back to `NVIDIA_NIM_API_KEY`.
   ```bash
   export NVIDIA_API_KEY=nvapi-...
   ```
2. **Pi Agent `auth.json` Config**: Alternatively, configure it globally using the Pi CLI:
   ```bash
   pi auth nvidia-nim
   # paste your nvapi- Key when prompted
   ```

---

## Usage

After installing and setting up the API key, start Pi Coding Agent. Open the model selector with `/model` and look for the `nvidia-nim/` namespace:

```bash
# Start Pi Coding Agent
pi

# In the Chat UI, query model selector:
/model nvidia-nim/
```

### Reasoning / Thinking
For models supporting reasoning (e.g., DeepSeek R1, GLM-5.1, Kimi K2.6), you can toggle the thinking intensity level in Pi. The adapter maps Pi's high/low request signals to the specific parameters the model expects (like injecting `reasoning_effort` or using templates kwargs).

---

## Updating Model Configurations

When new models are published by NVIDIA, you don't need to wait for a plugin release. Simply run the automated fetch script locally to update your configuration file:

```bash
# Make sure Bun is installed
bun run update-models
```

This fetches the latest models from NVIDIA, merges them with models.dev, ranks them, and writes a static configurations file directly to `src/generated/models.json` which is loaded dynamically by the runtime code.

## Credits & Acknowledgements

- **Upstream Project**: This project is an automated upgrade and optimization of the excellent [pi-nvidia-nim](https://github.com/xRyul/pi-nvidia-nim) extension created by [xRyul](https://github.com/xRyul). We thank them for their pioneering work on setting up model streaming adaptations and reasoning templates for the NVIDIA API.
- **Data Source**: Model specifications, context windows, and features metadata are sourced from the open-source [models.dev](https://github.com/anomalyco/models.dev) database created by [anomalyco](https://github.com/anomalyco). This plugin would not be automated without their community-driven model registry.

---

## License

MIT License.
