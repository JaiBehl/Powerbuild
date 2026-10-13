(function () {
  function encodeText(value) {
    return String(value || '')
      .trim()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function decodeText(value) {
    const box = document.createElement('textarea');
    box.innerHTML = String(value || '');
    return box.value;
  }

  window.addExerciseToWorkout = function (workoutIndex) {
    const nameInput = document.getElementById('newExerciseName');
    const prescriptionInput = document.getElementById('newExercisePrescription');
    if (!nameInput) return;

    const rawName = nameInput.value.trim();
    if (!rawName) {
      nameInput.focus();
      return;
    }

    const targetIndex = Number.isInteger(workoutIndex)
      ? workoutIndex
      : state.rotationIndex % state.rotation.length;
    const targetWorkout = state.rotation[targetIndex];
    if (!targetWorkout) return;

    targetWorkout.exercises.push({
      name: encodeText(rawName),
      prescription: encodeText(prescriptionInput?.value || '') || 'Custom exercise'
    });
    saveState();
    setTimeout(() => document.getElementById('newExerciseName')?.focus(), 0);
  };

  window.editWorkoutExercise = function (workoutIndex, exerciseIndex) {
    const workout = state.rotation[workoutIndex];
    const exercise = workout?.exercises?.[exerciseIndex];
    if (!exercise) return;

    const nextName = prompt('Exercise name', decodeText(exercise.name));
    if (nextName === null || !nextName.trim()) return;

    const nextPrescription = prompt('Notes / sets / rep target', decodeText(exercise.prescription || ''));
    if (nextPrescription === null) return;

    exercise.name = encodeText(nextName);
    exercise.prescription = encodeText(nextPrescription) || 'Custom exercise';
    saveState();
  };

  window.removeWorkoutExercise = function (workoutIndex, exerciseIndex) {
    const workout = state.rotation[workoutIndex];
    const exercise = workout?.exercises?.[exerciseIndex];
    if (!exercise) return;

    const exerciseName = decodeText(exercise.name);
    if (!confirm(`Remove ${exerciseName} from ${decodeText(workout.name)}?`)) return;
    workout.exercises.splice(exerciseIndex, 1);
    saveState();
  };
})();
