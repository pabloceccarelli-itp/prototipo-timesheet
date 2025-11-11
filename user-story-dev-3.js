
// Función para parsear comando de edición de horas
function parseEditHoursCommand(text) {
    const lowerText = text.toLowerCase();
    
    // Patrones: "cambiá/cambia las horas de la tarea [tarea] de [fecha] en proyecto [proyecto] a Xh"
    const patterns = [
        /cambi[áa]\s+las\s+horas\s+de\s+la\s+tarea\s+(.+?)\s+de\s+(.+?)\s+en\s+proyecto\s+(.+?)\s+a\s+(\d+)\s*h/i,
        /cambi[áa]\s+las\s+horas\s+de\s+la\s+tarea\s+(.+?)\s+de\s+(.+?)\s+en\s+proyecto\s+(.+?)\s+a\s+(\d+)\s*horas?/i,
        /cambi[áa]\s+las\s+horas\s+de\s+la\s+tarea\s+(.+?)\s+del\s+(.+?)\s+en\s+proyecto\s+(.+?)\s+a\s+(\d+)\s*h/i,
        /cambi[áa]\s+las\s+horas\s+de\s+la\s+tarea\s+(.+?)\s+del\s+(.+?)\s+en\s+proyecto\s+(.+?)\s+a\s+(\d+)\s*horas?/i,
        /edita\s+las\s+horas\s+de\s+la\s+tarea\s+(.+?)\s+de\s+(.+?)\s+en\s+proyecto\s+(.+?)\s+a\s+(\d+)\s*h/i,
        /edita\s+las\s+horas\s+de\s+la\s+tarea\s+(.+?)\s+de\s+(.+?)\s+en\s+proyecto\s+(.+?)\s+a\s+(\d+)\s*horas?/i
    ];
    
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            const tarea = match[1].trim();
            const fechaRef = match[2].trim();
            const proyecto = match[3].trim();
            const nuevasHoras = parseInt(match[4]);
            
            // Intentar parsear la fecha
            const fecha = parseDateReference(fechaRef);
            
            if (fecha) {
                return {
                    tarea: tarea,
                    proyecto: proyecto,
                    fecha: fecha,
                    fechaRef: fechaRef,
                    nuevasHoras: nuevasHoras
                };
            }
        }
    }
    
    return null;
}

// Función para buscar tarea en la base de datos
function findTask(tarea, proyecto, fecha) {
    return tasksDatabase.find(task => 
        task.tarea.toLowerCase() === tarea.toLowerCase() &&
        task.proyecto.toLowerCase() === proyecto.toLowerCase() &&
        task.fecha_inicio === fecha &&
        task.horas > 0 // Solo buscar tareas con horas (no feriados)
    );
}

// Función para procesar comando de edición
function processEditCommand(text) {
    const editCommand = parseEditHoursCommand(text);
    
    if (editCommand) {
        // Buscar la tarea
        const task = findTask(editCommand.tarea, editCommand.proyecto, editCommand.fecha);
        
        if (!task) {
            const fechaDisplay = formatDateForDisplay(editCommand.fecha);
            addMessage(`❌ No encontré la tarea "${editCommand.tarea}" en el proyecto "${editCommand.proyecto}" para ${editCommand.fechaRef} (${fechaDisplay}).`);
            return true;
        }
        
        const horasAnteriores = task.horas;
        const fechaDisplay = formatDateForDisplay(editCommand.fecha);
        const confirmMessage = `¿Confirmás cambiar las horas de la tarea "${editCommand.tarea}" del proyecto "${editCommand.proyecto}" de ${editCommand.fechaRef} (${fechaDisplay}) de ${horasAnteriores}h a ${editCommand.nuevasHoras}h?`;
        
        showConfirmation(
            confirmMessage,
            function() {
                // Actualizar las horas
                task.horas = editCommand.nuevasHoras;
                
                // Re-renderizar calendario si estamos en el mes correcto
                const taskDate = new Date(task.fecha_inicio + 'T00:00:00');
                if (taskDate.getFullYear() === currentYear && taskDate.getMonth() + 1 === currentMonth) {
                    renderCalendar(currentYear, currentMonth);
                } else {
                    if (taskDate.getFullYear() === currentYear) {
                        updateHoursSummary(currentYear, currentMonth);
                    }
                }
                
                setTimeout(() => {
                    addMessage(`✅ Perfecto! He cambiado las horas de la tarea "${editCommand.tarea}" del proyecto "${editCommand.proyecto}" de ${editCommand.fechaRef} (${fechaDisplay}) de ${horasAnteriores}h a ${editCommand.nuevasHoras}h.`);
                }, 500);
            },
            function() {
                addMessage('Operación cancelada. ¿Hay algo más en lo que pueda ayudarte?');
            }
        );
        
        return true;
    }
    
    return false;
}

