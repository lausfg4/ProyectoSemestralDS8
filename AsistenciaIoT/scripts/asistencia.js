
// =====================================================
// VALIDAR ROL Y CARGAR NAVBAR
// =====================================================
document.addEventListener("DOMContentLoaded", () => {
    const rol = localStorage.getItem("rol");

    if (rol !== "profesor") {
        Swal.fire({
            icon: "warning",
            title: "Acceso denegado",
            text: "Esta sección es solo para profesores.",
            confirmButtonColor: "#532b80"
        }).then(() => window.location.href = "Inicio.html");
        return;
    }

    document.getElementById("navbar").innerHTML = `
        <a class="nav-item" href="InicioProfesor.html">Inicio</a>
        <a class="nav-item active" href="Asistencia.html">Asistencia</a>
        <a class="nav-item" href="HorarioProfesor.html">Horario</a>

        <div class="nav-right">
            <a href="login.html" class="btn-logout" onclick="cerrarSesion()">Cerrar sesión</a>
        </div>
    `;
});

// Logout
function cerrarSesion() {
    localStorage.clear();
    window.location.href = "login.html";
}


// =====================================================
// CARGAR MATERIAS REALES DEL PROFESOR DESDE API
// =====================================================
async function cargarMaterias() {
    try {
        document.querySelector(".titulo-panel").innerText = "Materias del profesor";
        document.getElementById("listaAsistencias").innerHTML = "";

        const token = localStorage.getItem("token");
        const res = await fetch("http://161.35.190.4:8000/api/asignaturas_del_profesor/", {
            headers: { "Authorization": "Token " + token }
        });

        let materias = await res.json();
        console.log("Materias recibidas:", materias);

        if (!Array.isArray(materias)) materias = [materias];

        if (materias.length === 0) {
            document.getElementById("listaMaterias").innerHTML =
                "<div class='materia-item'>No hay materias asignadas.</div>";
            return;
        }

        document.getElementById("listaMaterias").innerHTML = materias
            .map(m => `
                <div class='materia-item'
                    onclick="cargarAsistencias(${m.materia_id}, '${m.nombre.replace(/'/g, "\\'")}')">
                    ${m.nombre}
                </div>
            `)
            .join("");

        document.getElementById("listaMaterias").style.display = "block";
    } catch (e) {
        console.error(e);
        Swal.fire("Error", "No se pudieron cargar las materias.", "error");
    }
}


async function cargarAsistencias(materia_id, nombre_materia) {
    document.querySelector(".titulo-panel").innerText = nombre_materia;
    const token = localStorage.getItem("token");

    let res = await fetch("http://161.35.190.4:8000/api/clases_del_dia/", {
        headers: { "Authorization": "Token " + token }
    });
    let clases = await res.json();
    if (!Array.isArray(clases)) clases = [];

    let horarios = clases.filter(c => c.materia === nombre_materia);

    if (horarios.length === 0) {
        const resAll = await fetch("http://161.35.190.4:8000/api/horarios_profesor/", {
            headers: { "Authorization": "Token " + token }
        });
        const todos = await resAll.json();
        horarios = (Array.isArray(todos) ? todos : [])
            .filter(h => h.materia === nombre_materia)
            .map(h => ({ horario_id: h.horario_id, materia: h.materia, inicio: h.inicio, fin: h.fin }));
    }

    if (!Array.isArray(horarios) || horarios.length === 0) {
        document.getElementById("listaMaterias").style.display = "none";
        document.getElementById("listaAsistencias").innerHTML =
            `<div class="asistencia-item">No hay horarios para esta materia.</div>`;
        return;
    }

    let html = "";
    let renderizados = 0;

    for (const h of horarios) {
        const horarioId = h.horario_id || h.id || h.horario;
        if (!horarioId) continue;

        const resAsist = await fetch(`http://161.35.190.4:8000/api/asistencia_clase/${encodeURIComponent(horarioId)}/`, {
            headers: { "Authorization": "Token " + token }
        });
        const registros = await resAsist.json();

        const fechasSet = new Set();
        (Array.isArray(registros) ? registros : []).forEach(a => {
            const f = a && a.fecha_registro ? a.fecha_registro.slice(0, 10) : "";
            if (f) fechasSet.add(f);
        });

        const fechas = Array.from(fechasSet).sort().reverse();
        if (fechas.length === 0) continue;

        fechas.forEach(fecha => {
            html += `
                <div class="asistencia-item">
                    ${nombre_materia} — Asistencia (${fecha})
                    <div class="acciones">
                        <button class="btn" onclick="abrirDia(${horarioId}, '${fecha}')">Abrir</button>
                        <button class="btn" onclick="generarPDFdia(${horarioId}, '${fecha}')">PDF</button>
                    </div>
                </div>`;
            renderizados++;
        });
    }

    document.getElementById("listaMaterias").style.display = "none";
    document.getElementById("listaAsistencias").innerHTML = renderizados > 0
        ? html
        : `<div class="asistencia-item">No hay asistencias registradas para esta materia.</div>`;
}



// =============================================
// MOSTRAR TABLA EDITABLE PARA EL PROFESOR (por día)
// =============================================
async function abrirDia(horario_id, fecha) {
    const token = localStorage.getItem("token");

    try {
        const res = await fetch(`http://161.35.190.4:8000/api/asistencia_clase/${encodeURIComponent(horario_id)}/`, {
            headers: { "Authorization": "Token " + token }
        });
        const data = await res.json();
        console.log("Asistencias (todas):", data);

        if (!Array.isArray(data) || data.length === 0) {
            Swal.fire("Sin registros", "No hay asistencias", "info");
            return;
        }

        // Filtrar solo la fecha seleccionada
        const delDia = data.filter(a => (a.fecha_registro || "").startsWith(fecha));

        if (delDia.length === 0) {
            Swal.fire("Sin registros", "No hay asistencias para esa fecha.", "info");
            return;
        }

        const tabla = document.querySelector("#tablaEdicion tbody");
        tabla.innerHTML = "";

        delDia.forEach(a => {
            // OJO: tu backend debe incluir asistencia_id en asistencia_clase para poder editar.
            // Si no, no se podrá llamar a /editar_asistencia/<id> correctamente.
            const asistenciaId = a.asistencia_id ?? ""; // si no viene, quedará vacío

            tabla.innerHTML += `
                <tr data-asistencia="${asistenciaId}">
                    <td>${a.nombre || ""}</td>
                    <td>${a.cedula || ""}</td>
                    <td><input type="checkbox" ${a.presente ? "checked" : ""} id="p_${asistenciaId}"></td>
                    <td><input type="text" value="${a.comentario || ""}" id="c_${asistenciaId}"></td>
                </tr>`;
        });

        // Mostrar panel
        document.getElementById("editorAsistencia").style.display = "block";

    } catch (e) {
        console.error(e);
        Swal.fire("Error", "No se pudo abrir la asistencia del día.", "error");
    }
}


// =============================================
// GUARDAR CAMBIO INDIVIDUAL
// =============================================
async function guardarAsistencia(asistencia_id) {
    const token = localStorage.getItem("token");
    if (!asistencia_id) {
        Swal.fire("Aviso", "No hay ID de asistencia para actualizar.", "warning");
        return;
    }

    try {
        const presente = document.getElementById(`p_${asistencia_id}`).checked;
        const comentario = document.getElementById(`c_${asistencia_id}`).value;

        const res = await fetch(`http://161.35.190.4:8000/api/editar_asistencia/${encodeURIComponent(asistencia_id)}/`, {
            method: "POST",
            headers: {
                "Authorization": "Token " + token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ presente, comentario })
        });

        const r = await res.json();
        console.log("Actualizado:", r);
        Swal.fire("Guardado", "Asistencia actualizada", "success");
    } catch (e) {
        console.error(e);
        Swal.fire("Error", "No se pudo guardar la asistencia.", "error");
    }
}


// =============================================
// CERRAR PANEL EDITOR
// =============================================
function cerrarEditor() {
    document.getElementById("editorAsistencia").style.display = "none";
}


// =============================================
// GENERAR PDF FINAL (desde la tabla editable visible)
// =============================================
async function generarPDFfinal() {
    const filas = document.querySelectorAll("#tablaEdicion tbody tr");

    if (filas.length === 0) {
        Swal.fire("No hay datos", "No hay asistencias cargadas.", "info");
        return;
    }

    const tablaPDF = [];
    filas.forEach(fila => {
        const columnas = fila.querySelectorAll("td");
        const nombre = columnas[0].innerText;
        const cedula = columnas[1].innerText;
        const presente = columnas[2].querySelector("input").checked ? "Presente" : "Ausente";
        const comentario = columnas[3].querySelector("input").value;
        tablaPDF.push([nombre, cedula, presente, comentario]);
    });

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Reporte Final de Asistencia", 14, 20);

    doc.setFontSize(12);
    const hoy = new Date().toISOString().split("T")[0];
    doc.text(`Fecha del reporte: ${hoy}`, 14, 30);

    doc.autoTable({
        head: [["Nombre", "Cédula", "Asistencia", "Comentario"]],
        body: tablaPDF,
        startY: 40
    });

    doc.save(`reporte_asistencia_${hoy}.pdf`);
    Swal.fire("PDF generado", "El archivo ha sido descargado.", "success");
}


// =============================================
// GENERAR PDF DE UN DÍA ESPECÍFICO (shortcut)
// =============================================
async function generarPDFdia(horario_id, fecha) {
    // reutiliza abrirDia para llenar la tabla del día y luego genera el PDF
    await abrirDia(horario_id, fecha);
    generarPDFfinal();
}


// =====================================================
// GUARDAR TODA LA ASISTENCIA DE UNA VEZ (tabla abierta)
// =====================================================
async function guardarTodo() {
    const token = localStorage.getItem("token");
    const filas = document.querySelectorAll("#tablaEdicion tbody tr");

    if (filas.length === 0) {
        Swal.fire("Sin datos", "No hay asistencia para guardar.", "info");
        return;
    }

    let actualizados = 0;

    for (let fila of filas) {
        const asistencia_id = fila.getAttribute("data-asistencia");
        if (!asistencia_id) continue; // si no hay ID, no se puede actualizar

        const presente = document.getElementById(`p_${asistencia_id}`).checked;
        const comentario = document.getElementById(`c_${asistencia_id}`).value;

        await fetch(`http://161.35.190.4:8000/api/editar_asistencia/${encodeURIComponent(asistencia_id)}/`, {
            method: "POST",
            headers: {
                "Authorization": "Token " + token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ presente, comentario })
        });

        actualizados++;
    }

    Swal.fire(
        "Asistencia guardada",
        `${actualizados} registros fueron actualizados correctamente.`,
        "success"
    );
}

