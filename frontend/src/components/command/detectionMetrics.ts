type ImageClassificationFrame = {
  knownTrash: boolean | null;
  trashDetected: boolean;
};

export function imageClassificationMeasurement(frames: ImageClassificationFrame[]) {
  const evaluatedFrames = frames.filter(frame => frame.knownTrash !== null);
  const knownTrashImages = evaluatedFrames.filter(frame => frame.knownTrash).length;
  const predictedTrashImages = evaluatedFrames.filter(frame => frame.trashDetected).length;
  const matchingImages = evaluatedFrames.filter(frame => frame.knownTrash === frame.trashDetected).length;
  const evaluatedImages = evaluatedFrames.length;

  return {
    evaluatedImages,
    knownTrashImages,
    predictedTrashImages,
    matchingImages,
    accuracyPercent: evaluatedImages ? matchingImages / evaluatedImages * 100 : null,
    imageGap: predictedTrashImages - knownTrashImages,
    knownBarPercent: evaluatedImages ? knownTrashImages / evaluatedImages * 100 : 0,
    detectedBarPercent: evaluatedImages ? predictedTrashImages / evaluatedImages * 100 : 0,
  };
}
