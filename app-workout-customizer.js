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

  function selectedWorkoutIndex() {
    const select = document.getElementById('customWorkoutTarget');
    if (select) return Number(select.value);
    return Number.isInteger(window._customWorkoutTarget)
      ? window._customWorkoutTarget
      : state.rotationIndex % state.rotation.length;
  }

  function renderExerciseList(container, workoutIndex) {
    const workout = state.rotation[workoutIndex];
    container.innerHTML = '';

    workout.exercises.forEach((exercise, exerciseIndex) => {
      const row = document.createElement('div');
      row.className = 'day';

      const top = document.createElement('div');
      top.className = 'row between wrap';

      const copy = document.createElement('div');
      const name = document.createElement('b');
      name.textContent = decodeText(exercise.name);
      const prescription = document.createElement('div');
      prescription.className = 'muted small';
      prescription.textContent = decodeText(exercise.prescription || '');
      copy.append(name, prescription);

      const actions = document.createElement('div');
      actions.className = 'row wrap';

      const editButton = document.createElement('button');
      editButton.type = 'button';
      editButton.className = 'btn ghost';
      editButton.textContent = 'Edit';
      editButton.addEventListener('click', () => window.editWorkoutExercise(workoutIndex, exerciseIndex));

      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'btn ghost';
      removeButton.textContent = 'Remove';
      removeButton.addEventListener('click', () => window.removeWorkoutExercise(workoutIndex, exerciseIndex));

      actions.append(editButton, removeButton);
      top.append(copy, actions);
      row.append(top);
      container.append(row);
    });
  }

  window.renderWorkoutCustomizerSettings = function () {
    const settingsGrid = document.querySelector('#settings > .grid.two');
    if (!settingsGrid) return;

    const card = document.createElement('div');
    card.className = 'card';

    const title = document.createElement('h2');
    title.textContent = 'Workout exercises';

    const subtitle = document.createElement('div');
    subtitle.className = 'muted small';
    subtitle.textContent = 'Customize exercises for any workout without changing the Train screen layout.';

    const stack = document.createElement('div');
    stack.className = 'stack';
    stack.style.marginTop = '12px';

    const workoutField = document.createElement('div');
    workoutField.className = 'field';
    const workoutLabel = document.createElement('label');
    workoutLabel.textContent = 'Workout';
    const workoutSelect = document.createElement('select');
    workoutSelect.id = 'customWorkoutTarget';

    state.rotation.forEach((workout, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = `${decodeText(workout.name)} (${workout.exercises.length})`;
      workoutSelect.appendChild(option);
    });

    const initialIndex = Number.isInteger(window._customWorkoutTarget)
      ? window._customWorkoutTarget
      : state.rotationIndex % state.rotation.length;
    workoutSelect.value = String(initialIndex);
    workoutField.append(workoutLabel, workoutSelect);

    const list = document.createElement('div');
    list.id = 'customExerciseList';
    renderExerciseList(list, initialIndex);

    workoutSelect.addEventListener('change', () => {
      window._customWorkoutTarget = Number(workoutSelect.value);
      renderExerciseList(list, window._customWorkoutTarget);
    });

    const nameField = document.createElement('div');
    nameField.className = 'field';
    const nameLabel = document.createElement('label');
    nameLabel.textContent = 'New exercise';
    const nameInput = document.createElement('input');
    nameInput.id = 'newExerciseName';
    nameInput.type = 'text';
    nameInput.placeholder = 'Type any exercise name';
    nameInput.autocomplete = 'off';
    nameField.append(nameLabel, nameInput);

    const prescriptionField = document.createElement('div');
    prescriptionField.className = 'field';
    const prescriptionLabel = document.createElement('label');
    prescriptionLabel.textContent = 'Notes / sets / reps';
    const prescriptionInput = document.createElement('input');
    prescriptionInput.id = 'newExercisePrescription';
    prescriptionInput.type = 'text';
    prescriptionInput.placeholder = 'Optional';
    prescriptionInput.autocomplete = 'off';
    prescriptionField.append(prescriptionLabel, prescriptionInput);

    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.className = 'btn primary';
    addButton.textContent = 'Add exercise';
    addButton.addEventListener('click', window.addExerciseToWorkout);

    [nameInput, prescriptionInput].forEach((input) => {
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') window.addExerciseToWorkout();
      });
    });

    stack.append(workoutField, list, nameField, prescriptionField, addButton);
    card.append(title, subtitle, stack);
    settingsGrid.append(card);
  };

  window.addExerciseToWorkout = function () {
    const nameInput = document.getElementById('newExerciseName');
    const prescriptionInput = document.getElementById('newExercisePrescription');
    if (!nameInput) return;

    const rawName = nameInput.value.trim();
    if (!rawName) {
      nameInput.focus();
      return;
    }

    const targetIndex = selectedWorkoutIndex();
    const targetWorkout = state.rotation[targetIndex];
    if (!targetWorkout) return;

    targetWorkout.exercises.push({
      name: encodeText(rawName),
      prescription: encodeText(prescriptionInput?.value || '') || 'Custom exercise'
    });

    window._customWorkoutTarget = targetIndex;
    saveState();
    setTimeout(() => document.getElementById('newExerciseName')?.focus(), 0);
  };

  window.editWorkoutExercise = function (workoutIndex, exerciseIndex) {
    const workout = state.rotation[workoutIndex];
    const exercise = workout?.exercises?.[exerciseIndex];
    if (!exercise) return;

    const nextName = prompt('Exercise name', decodeText(exercise.name));
    if (nextName === null || !nextName.trim()) return;

    const nextPrescription = prompt(
      'Notes / sets / rep target',
      decodeText(exercise.prescription || '')
    );
    if (nextPrescription === null) return;

    exercise.name = encodeText(nextName);
    exercise.prescription = encodeText(nextPrescription) || 'Custom exercise';
    window._customWorkoutTarget = workoutIndex;
    saveState();
  };

  window.removeWorkoutExercise = function (workoutIndex, exerciseIndex) {
    const workout = state.rotation[workoutIndex];
    const exercise = workout?.exercises?.[exerciseIndex];
    if (!exercise) return;

    const exerciseName = decodeText(exercise.name);
    if (!confirm(`Remove ${exerciseName} from ${decodeText(workout.name)}?`)) return;

    workout.exercises.splice(exerciseIndex, 1);
    window._customWorkoutTarget = workoutIndex;
    saveState();
  };
})();
