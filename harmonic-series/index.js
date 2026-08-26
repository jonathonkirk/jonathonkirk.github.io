// Set to > 0 if the DSP is polyphonic
const FAUST_DSP_VOICES = 0;

/**
 * @typedef {import("./faustwasm").FaustAudioWorkletNode} FaustAudioWorkletNode
 * @typedef {import("./faustwasm").FaustDspMeta} FaustDspMeta
 */

/** @type {HTMLSpanElement} */
const $spanAudioInput = document.getElementById("audio-input");
/** @type {HTMLSpanElement} */
const $spanMidiInput = document.getElementById("midi-input");
/** @type {HTMLSelectElement} */
const $selectAudioInput = document.getElementById("select-audio-input");
/** @type {HTMLSelectElement} */
const $selectMidiInput = document.getElementById("select-midi-input");
/** @type {HTMLButtonElement} */
const $buttonDsp = document.getElementById("button-dsp");
/** @type {HTMLDivElement} */
const $divFaustUI = document.getElementById("div-faust-ui");

/** @type {typeof AudioContext} */
const AudioCtx = window.AudioContext || window.webkitAudioContext;
const audioContext = new AudioCtx({ latencyHint: 0.00001 });
audioContext.destination.channelInterpretation = "discrete";
audioContext.suspend();

// Declare faustNode as a global variable
let faustNode;
let sensorHandlersBound = false;

/**
 * @param {FaustAudioWorkletNode} faustNode
 */
const buildAudioDeviceMenu = async (faustNode) => {
    let inputStreamNode = null;
    const { connectToAudioInput } = await import("./create-node.js");
    const handleDeviceChange = async () => {
        const devicesInfo = await navigator.mediaDevices.enumerateDevices();
        $selectAudioInput.innerHTML = "";
        devicesInfo.forEach((deviceInfo, i) => {
            const { kind, deviceId, label } = deviceInfo;
            if (kind === "audioinput") {
                const option = new Option(label || `microphone ${i + 1}`, deviceId);
                $selectAudioInput.add(option);
            }
        });
    };
    await handleDeviceChange();
    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);
    $selectAudioInput.onchange = async () => {
        const id = $selectAudioInput.value;
        if (faustNode.getNumInputs() > 0) {
            inputStreamNode = await connectToAudioInput(audioContext, id, faustNode, inputStreamNode);
        }
    };
    if (faustNode.getNumInputs() > 0) {
        inputStreamNode = await connectToAudioInput(audioContext, null, faustNode, inputStreamNode);
    }
};

/**
 * @param {FaustAudioWorkletNode} faustNode
 */
const buildMidiDeviceMenu = async (faustNode) => {
    const { createKey2MIDI } = await import("./create-node.js");
    let keyboard2MIDI = createKey2MIDI((event) => faustNode.midiMessage(event));
    let isKeyboardActive = false;

    const midiAccess = await navigator.requestMIDIAccess();
    let currentInput;
    const handleMidiMessage = (e) => faustNode.midiMessage(e.data);
    const handleStateChange = () => {
        const { inputs } = midiAccess;
        const expectedOptions = inputs.size + 2; // "Select..." + "Keyboard"
        if ($selectMidiInput.options.length === expectedOptions) return;

        if (currentInput) currentInput.removeEventListener("midimessage", handleMidiMessage);
        $selectMidiInput.innerHTML = '<option value="-1" disabled selected>Select...</option>';

        const keyboardOption = new Option("Computer Keyboard", "Computer Keyboard");
        $selectMidiInput.add(keyboardOption);

        inputs.forEach((midiInput) => {
            const { name, id } = midiInput;
            $selectMidiInput.add(new Option(name, id));
        });
    };
    handleStateChange();
    midiAccess.addEventListener("statechange", handleStateChange);
    $selectMidiInput.onchange = () => {
        if (currentInput) currentInput.removeEventListener("midimessage", handleMidiMessage);
        currentInput = null;
        if (isKeyboardActive) {
            keyboard2MIDI.stop();
            isKeyboardActive = false;
        }
        const selectedValue = $selectMidiInput.value;
        if (selectedValue === "Computer Keyboard") {
            keyboard2MIDI.start();
            isKeyboardActive = true;
        } else {
            currentInput = midiAccess.inputs.get(selectedValue);
            if (currentInput) currentInput.addEventListener("midimessage", handleMidiMessage);
        }
    };
};

// Called at load time: compile/load the DSP and build its UI, then enable
// the Start button. Audio-input and MIDI device menus are set up afterward,
// without blocking the button on them - navigator.requestMIDIAccess() waits
// on a permission prompt that may never resolve if the visitor ignores it,
// and this demo doesn't need MIDI/mic to work.
(async () => {
    const { createFaustNode, createFaustUI } = await import("./create-node.js");

    const result = await createFaustNode(audioContext, "harmonic", FAUST_DSP_VOICES);
    faustNode = result.faustNode;
    if (!faustNode) throw new Error("Faust DSP not compiled");

    await createFaustUI($divFaustUI, faustNode);

    faustNode.connect(audioContext.destination);

    document.title = result.dspMeta.name || document.title;
    $buttonDsp.textContent = "Start";
    $buttonDsp.disabled = false;

    // Fire-and-forget: fine to finish later, shouldn't block the demo.
    if (faustNode.numberOfInputs > 0) {
        buildAudioDeviceMenu(faustNode).catch((err) => console.warn("Audio input menu unavailable:", err));
    } else {
        $spanAudioInput.hidden = true;
    }

    if (navigator.requestMIDIAccess) {
        buildMidiDeviceMenu(faustNode).catch((err) => console.warn("MIDI menu unavailable:", err));
    } else {
        $spanMidiInput.hidden = true;
    }
})().catch((err) => {
    console.error(err);
    $buttonDsp.textContent = "Failed to load (see console)";
});

// Activate AudioContext on user interaction (required by browser autoplay policy)
$buttonDsp.onclick = async () => {
    const { requestPermissions } = await import("./create-node.js");
    await requestPermissions();

    if (!sensorHandlersBound) {
        await faustNode.startSensors();
        sensorHandlersBound = true;
    }

    if (audioContext.state === "running") {
        $buttonDsp.textContent = "Start";
        await audioContext.suspend();
    } else if (audioContext.state === "suspended") {
        $buttonDsp.textContent = "Stop";
        await audioContext.resume();
    }
};
