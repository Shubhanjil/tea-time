import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";
import { marked } from "marked";
import html2canvas from "html2canvas";
import jsPDF from 'jspdf';

function App() {
    const [focusSpan, setFocusSpan] = useState(25);
    const [tasks, setTasks] = useState([{ name: "", priority: "Medium" }]);
    const [startTime, setStartTime] = useState("09:00");
    const [endTime, setEndTime] = useState("17:00");
    const [mode, setMode] = useState("daily");
    const [notes, setNotes] = useState("");
    const [timetable, setTimetable] = useState("");
    const [loading, setLoading] = useState(false);
    const [timetableGenerated, setTimetableGenerated] = useState(false);

    const clearAllData = () => {
      // Clear all states and localStorage
      localStorage.clear();
      setTasks([{ name: "", priority: "Medium" }]);
      setTimetable("");
      setFocusSpan(25);  // Reset focus span to default
      setStartTime("09:00");  // Reset start time to default
      setEndTime("17:00");  // Reset end time to default
      setMode("daily");  // Reset mode to default
      setNotes("");  // Clear notes
    };
  

    const apiKey = process.env.REACT_APP_COHERE_API_KEY;

    const themes = {
      sky: {
        '--bg': '#e8f7ff',             // Light sky blue background
        '--text-dark': '#2d4a6d',      // Deep navy blue for text
        '--highlight': '#b2d8f7',      // Soft sky blue highlight
        '--card-bg': '#f0f9ff',        // Very light blue for cards
        '--input-bg': '#d1e8f4',       // Soft pastel blue for inputs
        '--button-bg': '#4fa3d1',      // Sky blue button background
        '--button-hover': '#3c8fb5',   // Slightly darker blue for button hover
        '--accent-light': '#92c9e1',   // Light teal blue accents
        '--table-bg': '#ffffff',       // Clean white table background
        '--table-alt-bg': '#f0faff'    // Lightest blue for alternate table rows
      },
      lavender: {
        '--bg': '#f9f7fb',
        '--text-dark': '#1a1a1a',
        '--highlight': '#ffffff',
        '--card-bg': '#ffffff',
        '--input-bg': '#f0eef5',
        '--button-bg': '#b8a9d1',
        '--button-hover': '#9e90c1',
        '--accent-light': '#d3c4e3',
        '--table-bg': '#fbf8fc',
        '--table-alt-bg': '#f2e9f3'
      },
      classic: {
        '--bg': '#121212',             // Jet black background
        '--text-dark': '#f4f4f4',      // Light text for contrast
        '--highlight': '#1e1e2e',      // Very dark indigo
        '--card-bg': '#2c2a3b',        // Muted twilight purple
        '--input-bg': '#3a3650',       // Deep royal plum
        '--button-bg': '##4b378c',      // Bold regal purple
        '--button-hover': '#5a3ea3',   // Slightly deeper on hover
        '--accent-light': '#a48df2',   // Lavender accent
        '--table-bg': '#2a263b',       // Table: deep blue-purple
        '--table-alt-bg': '#332f48'    // Table alt: twilight shado
      },
      blossom: {
        '--bg': '#fdf2f8',
        '--text-dark': '#3d1f30',
        '--highlight': '#ffe4f1',
        '--card-bg': '#fff0f7',
        '--input-bg': '#fbe4ee',
        '--button-bg': '#d75a91',
        '--button-hover': '#c1477f',
        '--accent-light': '#e693b5',
        '--table-bg': '#fff7fb',
        '--table-alt-bg': '#fae0ed'
      },
      oolong: {
        '--bg': '#1f1b24',            // Deep plum black
        '--text-dark': '#f4f1ed',     // Soft latte cream
        '--highlight': '#2a2433',     // Shadowy violet-brown
        '--card-bg': '#3b324b',       // Rich muted eggplant
        '--input-bg': '#4a3d5c',      // Dusky lilac
        '--button-bg': '#c8a4ce',     // Lavender milk tea
        '--button-hover': '#b790c1',  // Stronger violet tone
        '--accent-light': '#e1cfe8',  // Frosted pink-lavender
        '--table-bg': '#32293f',      // Table: twilight purple
        '--table-alt-bg': '#3d314d'   // Table alt: plum blend
      },
      midnight: {
        '--bg': '#121212',
        '--text-dark': '#f5f5f5',
        '--highlight': '#1f1f1f',
        '--card-bg': '#242424',
        '--input-bg': '#2c2c2c',
        '--button-bg': '#3a3a3a',
        '--button-hover': '#555555',
        '--accent-light': '#3d3d3d',
        '--table-bg': '#1f1f1f',
        '--table-alt-bg': '#292929',
      }
    };
  
    function setTheme(themeName) {
      const theme = themes[themeName];
      if (!theme) return;
      Object.entries(theme).forEach(([varName, value]) => {
          document.documentElement.style.setProperty(varName, value);
      });
    }

    const downloadTimetableAsImage = () => {
      const timetable = document.querySelector('.timetable-output table');
      html2canvas(timetable).then(canvas => {
          const link = document.createElement('a');
          link.download = 'timetable.png';
          link.href = canvas.toDataURL();
          link.click();
      });
    };
    
    const downloadTimetableAsCSV = () => {
        const table = document.querySelector('.timetable-output table');
        let csv = '';
        for (let row of table.rows) {
            let rowData = [];
            for (let cell of row.cells) {
                rowData.push(`"${cell.innerText}"`);
            }
            csv += rowData.join(',') + '\n';
        }
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'timetable.csv';
        link.click();
    };
    
    const downloadTimetableAsPDF = () => {
      const timetable = document.querySelector('.timetable-output table');
      html2canvas(timetable).then(canvas => {
        const pdf = new jsPDF('p', 'pt', 'a4'); // landscape mode
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        const margin = 20; // 20pt margin
        const usableWidth = pdfWidth - margin * 2;
        const usableHeight = pdfHeight - margin * 2;

        const imgWidth = canvas.width;
        const imgHeight = canvas.height;

        const ratio = pdfWidth / imgWidth;
        const scaledHeight = imgHeight * ratio;

        let position = 0;

        // Split into pages if necessary
        while (position < scaledHeight) {
            const pageCanvas = document.createElement('canvas');
            pageCanvas.width = canvas.width;
            pageCanvas.height = (usableHeight / ratio); // amount of pixels fitting in one page

            const ctx = pageCanvas.getContext('2d');
            ctx.drawImage(
                canvas,
                0, position / ratio,             // source x, y
                canvas.width, pageCanvas.height, // source width, height
                0, 0,                             // destination x, y
                canvas.width, pageCanvas.height  // destination width, height
            );

            const img = pageCanvas.toDataURL('image/png');
            if (position > 0) pdf.addPage();
            pdf.addImage(img, 'PNG', margin, margin, usableWidth, usableHeight);

            position += usableHeight;
        }

        pdf.save('timetable.pdf');
    });
    };
  

    useEffect(() => {
      const fetchModels = async () => {
        try {
          const response = await axios.get("https://api.openai.com/v1/models", {
            headers: {
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
          });
          const modelList = response.data.data.map((model) => model.id);
          console.log("Available Models:", modelList);
        } catch (error) {
          console.error("Error fetching models:", error.response?.data || error.message);
        }
      };

        fetchModels();
    }, [apiKey]);

    const handleTaskChange = (index, field, value) => {
      const updatedTasks = [...tasks];
      updatedTasks[index][field] = value;
      setTasks(updatedTasks);
    };

    const addTask = () => {
      setTasks([...tasks, { name: "", priority: "Medium" }]);
    };

    const removeTask = (index) => {
      const updatedTasks = [...tasks];
      updatedTasks.splice(index, 1);
      setTasks(updatedTasks);
    }; 

    const handleSubmit = async (e) => {
      e.preventDefault();
      setLoading(true);
      setTimetable(""); // clear previous result
  
    const formData = {
      focusSpan,
      tasks,
      startTime,
      endTime,
      mode,
      notes,
    };
  
    const prompt = `Create a personalized ${formData.mode} timetable in tabular format for someone with a maximum attention span of ${formData.focusSpan} minutes.
Tasks:
${formData.tasks.map((t, i) => `${i + 1}. ${t.name} - Priority: ${t.priority}`).join("\n")}
Time window: ${formData.startTime} to ${formData.endTime}.
${notes ? `Special instructions:\n${notes}` : ""}
Prioritize tasks and divide time wisely. Return in readable format.`;

    try {
      const response = await axios.post(
        "https://api.cohere.ai/v1/chat",
        {
          model: "command-r-plus",
          message: prompt,
        },
        {
        headers: {
          "Authorization": `Bearer ${process.env.REACT_APP_COHERE_API_KEY}`,
          "Content-Type": "application/json",
        },
      });
  
      const aiResponse = response.data.text ||response.data.reply || "No reply from AI." ;
      console.log("Cohere Response : ", response.data);
      setTimetable(aiResponse);
    } catch (error) {
      console.error("Error generating timetable:", error.response || error.message);
      setTimetable("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
      setTimetableGenerated(true);
    }
  };
  

  return (
    <div className="app">
      <h1>Tea Time 🍵</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Focus Span (minutes):
          <input
            type="number"
            value={focusSpan}
            onChange={(e) => setFocusSpan(e.target.value)}
            min="5"
          />
        </label>

        <h2>Tasks</h2>
        {tasks.map((task, index) => (
          <div key={index} className="task-input">
            <input
              type="text"
              placeholder="Task name"
              value={task.name}
              onChange={(e) =>
                  handleTaskChange(index, "name", e.target.value)
              }
              required
            />
            <select
              value={task.priority}
              onChange={(e) =>
                  handleTaskChange(index, "priority", e.target.value)
              }
            >
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
            </select>
            {tasks.length > 1 && (
              <button type="button" onClick={() => removeTask(index)}>
                  ❌
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={addTask}>
          ➕ Add Task
        </button>

        <label>
          Start Time:
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </label>

        <label>
          End Time:
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </label>

        <label>
          Mode:
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </label>

        <label>
          Special Instructions:
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. I need 15-minute breaks after each task, or avoid scheduling after 3 PM."
            rows={4}
          />
        </label>
        <button className="clear-data" onClick={clearAllData}>
          Clear All Data
        </button>

        <button type="submit">Generate Timetable</button>
      </form>

      <div className="theme-controls">
        <label htmlFor="theme-selector">Theme:</label>
        <select id="theme-selector" onChange={(e) => setTheme(e.target.value)}>
          <option value="sky">Sky</option>
          <option value="lavender">Lavender</option>
          <option value="blossom">Blossom</option>
          <option value="classic">Classic</option>
          <option value="oolong">Oolong</option>
          <option value="midnight">Midnight</option>
        </select>
      </div>

      {loading && <p>Generating your personalized timetable... 🧠⏳</p>}

      {timetable && (
        <div>
          <h2>Your Timetable 📅</h2>
          <div
            className="timetable-output"
            dangerouslySetInnerHTML={{ __html: marked.parse(timetable) }}/>
        </div>
      )}
      {timetableGenerated && (
      <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <button onClick={downloadTimetableAsImage}>Save as PNG</button>
        <button onClick={downloadTimetableAsCSV}>Download CSV</button>
        <button onClick={downloadTimetableAsPDF}>Download PDF</button>
      </div>
    )}
    </div>
  );
}

export default App;
