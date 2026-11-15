# Ares Vision

A working browser inference viewer using an actual trained AI4Mars four-class model. It is an experimental research tool. It does not measure traversability or change route safety.

## Provenance

- Training data: [NASA JPL AI4Mars](https://data.nasa.gov/dataset/ai4mars-a-dataset-for-terrain-aware-autonomous-driving-on-mars). The original 2021 paper describes soil, bedrock, sand and big-rock semantic labels: [Swan et al., CVPR Workshops](https://openaccess.thecvf.com/content/CVPR2021W/AI4Space/html/Swan_AI4MARS_A_Dataset_for_Terrain-Aware_Autonomous_Driving_on_Mars_CVPRW_2021_paper.html).
- Checkpoint: `final_model/v2_R11_MNv4-S_512.pth` from [Arsianto & Devanaboina, Terrain Detection for Autonomous Mars Rovers, Linnaeus University, 2026](https://github.com/KeenanSylo/ai4mars-lightweight-segmentation). This third-party research model is not an official NASA inference product. The repository releases code under MIT; its citation instructions include released checkpoints. The bundled license retains the upstream copyright. The NASA data catalog does not specify a dataset license; this site does not redistribute the training dataset.
- Sample: left-photograph crop of [NASA/JPL-Caltech PIA23897](https://www.jpl.nasa.gov/images/pia23897-martian-terrain-as-viewed-in-ai4mars/), published June12,2020, a Curiosity Navigation Camera photograph. Exact acquisition timestamp and coordinates are not specified by that record. The crop is resampled for model input, not treated as georeferenced imagery.

## Model and conversion

Architecture: `segmentation_models_pytorch.DeepLabV3Plus(encoder_name='tu-mobilenetv4_conv_small', encoder_weights=None, in_channels=3, classes=4)`.

Weights loaded with `torch.load(..., weights_only=True)` to avoid arbitrary pickle execution. Dependencies used for conversion: PyTorch2.6.0CPU, torchvision0.21.0CPU, segmentation-models-pytorch0.5.0, timm1.0.22, ONNX1.19.1, ONNXRuntime1.23.2. Export uses ONNXopset17, fixed input [1,3,512,512]. Input is RGB, values0–1, no ImageNet mean/std normalization, matching the upstream training preprocessor. Class order is0soil,1bedrock,2sand,3big_rock.

The deployable file is statically quantized with ORT QDQ, unsigned8-bit activations and signed8-bit per-channel weights. Calibration uses the single bundled NASA crop and its horizontal mirror. This is a small calibration set; robustness and accuracy of this quantized variant are unverified. Source checkpoint and converted-model SHA256 values, conversion parameters, and upstream reported evaluation metadata are bundled in `public/assets/vision-model.json`.

The viewer runs genuine per-pixel logits, softmax and argmax in browser WASM. Highest class scores below0.60 are rendered unclassified. Confidence is explicitly not measured accuracy. Sky and hardware are not classes. The upstream training data masks rover hardware and distant terrain; this viewer lacks calibrated range and rover masks, so these regions can be confidently misclassified.

## Runtime and privacy

ONNXRuntimeWeb1.23.2 is loaded from the fixed jsDelivr version only after the user requests analysis. WASM is single-threaded to support the existing hosting headers. Images are processed locally and are not uploaded. First use downloads the runtime and the3.36MB bundled model. A network/runtime failure produces an unavailable message and never a fabricated overlay.

## Integration

Include `/vision.css` and `/vision.js`; the script inserts section#vision before#sources. It sends `ares:terrain-analysis` with class fractions, provenance and limits. These image-space summaries must not automatically modify route safety or map exclusions. Without verified geographic/camera metadata, neither user images nor the sample are placed on the orbital map.

The viewer listens for `ares:historical-date` and identifies when the sample publication is later than the selected date. It does not invent historical acquisition dates or claim the sample is a photograph from the selected period.

Mask import accepts validated JSON only with `width`, `height` and flat `labels`. IDs must be0,1,2,3or255. Dimensions must match the original photo or512×512. Imported masks are labeled user-provided; they are not claimed as model predictions. Export includes grayscale label PNG and JSON metadata with class IDs and provenance.

## Validation performed

- `node --check public/vision.js` passed.
- Full-precision ONNX numerical output tested against PyTorch on the bundled sample. Maximum absolute logit difference2.81334e-5, pixel-label agreement100%.
- Quantized ONNX executed with Python ONNXRuntimeCPU on the same sample: label agreement95.5593% against the full-precision model; all four classes present. This is a conversion smoke test, not a labeled accuracy test.
- No labeled IoU/precision/recall or confusion-matrix evaluation of the quantized browser variant was performed. Upstream reported metrics are provenance only and are not presented as this variant's demonstrated accuracy.
- Browser execution, upload, opacity, export and deployment checks are performed by the integrating site owner. Until those checks are run, they remain unverified.
