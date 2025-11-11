// User Story 5: Duplicar entradas de la semana pasada a esta semana

// Parseo: "Copiá mis horas de la semana pasada en proyecto Delta"
function parseDuplicateLastWeekCommand(text) {
	const patterns = [
		/cop[ií][áa]\s+mis\s+horas\s+de\s+la\s+semana\s+pasada\s+en\s+proyecto\s+(.+?)\.?$/i,
		/cop[ií][áa]\s+las\s+horas\s+de\s+la\s+semana\s+pasada\s+en\s+proyecto\s+(.+?)\.?$/i
	];

	for (const pattern of patterns) {
		const m = text.match(pattern);
		if (m) {
			return { proyecto: m[1].trim() };
		}
	}
	return null;
}

function getWeekRange(referenceDate) {
	// Devuelve lunes..domingo en formato YYYY-MM-DD de la semana que contiene referenceDate
	const ref = new Date(referenceDate);
	const day = ref.getDay(); // 0 dom .. 6 sab
	const mondayOffset = day === 0 ? -6 : 1 - day;
	const monday = new Date(ref);
	monday.setDate(ref.getDate() + mondayOffset);
	const range = [];
	for (let i = 0; i < 7; i++) {
		const d = new Date(monday);
		d.setDate(monday.getDate() + i);
		range.push(formatDate(d.getFullYear(), d.getMonth() + 1, d.getDate()));
	}
	return range;
}

function getLastWeekRange() {
	const today = new Date();
	const thisWeekMonday = getWeekRange(today)[0];
	const monday = new Date(thisWeekMonday + 'T00:00:00');
	monday.setDate(monday.getDate() - 7);
	return getWeekRange(monday);
}

function getThisWeekRange() {
	const today = new Date();
	return getWeekRange(today);
}

// Busca si existe una tarea igual (mismo proyecto, tarea y fecha)
function findExistingTask(proyecto, tarea, fecha) {
	return tasksDatabase.find(
		(t) =>
			t.proyecto.toLowerCase() === proyecto.toLowerCase() &&
			t.tarea.toLowerCase() === tarea.toLowerCase() &&
			t.fecha_inicio === fecha &&
			t.horas > 0
	);
}

function processDuplicateLastWeekCommand(text) {
	const parsed = parseDuplicateLastWeekCommand(text);
	if (!parsed) return false;

	// Calcular semanas
	const lastWeek = getLastWeekRange(); // 7 fechas
	const thisWeek = getThisWeekRange(); // 7 fechas

	// Tareas fuente
	const sourceTasks = tasksDatabase.filter(
		(t) =>
			t.id_usuario === 1 &&
			t.horas > 0 &&
			t.proyecto.toLowerCase() === parsed.proyecto.toLowerCase() &&
			lastWeek.includes(t.fecha_inicio)
	);

	if (sourceTasks.length === 0) {
		addMessage(
			`❌ No encontré horas en la semana pasada para el proyecto "${parsed.proyecto}".`
		);
		return true;
	}

	const fechaDisplayFrom = formatDateForDisplay(lastWeek[0]);
	const fechaDisplayTo = formatDateForDisplay(thisWeek[0]);
	const confirmMessage = `¿Confirmás copiar ${sourceTasks.length} entrada${
		sourceTasks.length > 1 ? 's' : ''
	} del proyecto "${parsed.proyecto}" de la semana pasada (desde ${fechaDisplayFrom}) a esta semana (desde ${fechaDisplayTo})?`;

	showConfirmation(
		confirmMessage,
		function () {
			// Mapear por índice de día dentro de la semana (0..6)
			sourceTasks.forEach((task) => {
				const dayIndex = lastWeek.indexOf(task.fecha_inicio);
				if (dayIndex >= 0) {
					const targetDate = thisWeek[dayIndex];
					const existing = findExistingTask(task.proyecto, task.tarea, targetDate);
					if (existing) {
						// Reemplazar horas
						existing.horas = task.horas;
					} else {
						const newTask = createTask(
							task.proyecto,
							task.tarea,
							targetDate,
							task.horas,
							task.detalle
						);
						tasksDatabase.push(newTask);
					}
				}
			});

			// Re-render calendar/summary si cae en mes actual
			const anyInCurrentMonth = thisWeek.some((d) => {
				const dt = new Date(d + 'T00:00:00');
				return dt.getFullYear() === currentYear && dt.getMonth() + 1 === currentMonth;
			});
			if (anyInCurrentMonth) {
				renderCalendar(currentYear, currentMonth);
			} else {
				updateHoursSummary(currentYear, currentMonth);
			}

			setTimeout(() => {
				addMessage(
					`✅ Listo. Copié las horas de la semana pasada para el proyecto "${parsed.proyecto}" a esta semana.`
				);
			}, 500);
		},
		function () {
			addMessage('Operación cancelada. ¿Hay algo más en lo que pueda ayudarte?');
		}
	);

	return true;
}


