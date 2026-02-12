import './App.css';
import React, {useState} from 'react';
import JSZip from 'jszip';
import {saveAs} from 'file-saver';
import {ToastContainer, toast} from 'react-toastify';

import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faCheckCircle, faDownload, faPlus, faTrash, faUpload, faUser} from "@fortawesome/free-solid-svg-icons";

import {Jomini} from "jomini";
import {faGithub} from "@fortawesome/free-brands-svg-icons";

const speciesTypes = {
  HUMAN: "humans",
  MACHINE: "machines",
  MAMMALIAN: "mammalians",
  REPTILIAN: "reptilians",
  AVIAN: "avians",
  ARTHROPOID: "arthropoids",
  MOLLUSCOID: "molluscoids",
  FUNGOID: "fungoids",
  PLANTOID: "plantoids",
  LITHOID: "lithoids",
  NECROID: "necroids",
  AQUATIC: "aquatics",
  TOXOID: "toxoids",
  CYBERNETIC: "cybernetics",  // INCORRECT
  SYNTHETIC: "synthetics",  // INCORRECT
  BIOGENESIS: "biogenesis",  // INCORRECT
  PSIONIC: "psionics",  // INCORRECT
  INFERNAL: "infernals"
}

function writeObject(writer, obj) {
  for (const key in obj) {
    const val = obj[key];

    // Write field name
    writer.write_unquoted(key);

    if (Array.isArray(val)) {
      // Handle array as a block of values
      writer.write_array_start();
      for (const v of val) {
        if (typeof v === "string") {
          writer.write_quoted(v);
        } else {
          writer.write_unquoted(String(v));
        }
      }
      writer.write_end();
    } else if (typeof val === "object") {
      // Nested object > write block
      writer.write_object_start();
      writeObject(writer, val);
      writer.write_end();
    } else if (typeof val === "string") {
      writer.write_quoted(val);
    } else {
      writer.write_unquoted(String(val));
    }
  }
}


const generateId = (length) => {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const App = () => {
  // Portrait data and metadata
  const [portraits, setPortraits] = useState([]);

  const createZipAndDownload = async () => {
    var issueFound = false;
    const t = toast.loading('Generating zip file...');

    // Add a list of human readable data to the log div
    const logDiv = document.querySelector('.log');
    logDiv.innerHTML = '';
    portraits.forEach(p => {
      const portraitInfo = `ID: ${p.id}, Type: ${p.type}, Image: ${p.imageData ? 'Yes' : 'No'}`;
      const pElement = document.createElement('p');
      pElement.textContent = portraitInfo;
      logDiv.appendChild(pElement);
    });

    // Check all portraits have image data before proceeding
    for (const p of portraits) {
      if (!p.imageData) {
        toast.error(`Portrait ID ${p.id} is missing image data!`);
        logDiv.innerHTML += `<p style="color: red;">Error: Portrait ID ${p.id} is missing image data!</p>`;
        issueFound = true;
      }
    }
    if (issueFound) {
      toast.update(t, {
        render: `Failed to generate zip file! Please fix the issues in the log.`,
        type: 'error',
        isLoading: false,
        autoClose: 5000
      });
      return;
    }

    const zip = new JSZip();

    // Create common/portrait_sets folder with 0_portrait_sets.txt
    const commonFolder = zip.folder('common');
    const portraitSetsFolder = commonFolder.folder('portrait_sets');
    var portData = {};

    // Put each portrait in its correct portrait_set
    portraits.forEach((p) => {
      // Sort into portrait sets based on type (EG:
      // humans = {
      //     species_class = HUMAN
      //
      //     portraits = {
      //
      //         "portrait_id"
      //
      //     }
      // }
      if (!portData[speciesTypes[p.type]]) {
        portData[speciesTypes[p.type]] = {
          species_class: p.type,
          portraits: []
        }
      }
      portData[speciesTypes[p.type]].portraits.push(p.id);
    });
    console.log(portData);
    const parser = await Jomini.initialize();

    const outputBytes = parser.write((writer) => {
      writeObject(writer, portData);
    });
    console.log(outputBytes);
    // convert outputBytes (Uint8Array) to string
    const outputString = new TextDecoder().decode(outputBytes);
    console.log(outputString);
    portraitSetsFolder.file('0_portrait_sets.txt', outputString);

    // Create GFX folders
    const gfxTextures = zip.folder('gfx').folder('models').folder('portraits');
    const gfxConfig = zip.folder('gfx').folder('portraits').folder('portraits');

    portraits.forEach((p) => {
      // Create a folder for each portrait using its ID
      const portraitGFX = gfxTextures.folder(p.id);
      // Add the image data as a .dds file
      portraitGFX.file(`${p.id}.dds`, p.imageData.split(',')[1], {base64: true});

      // Add gfx config for each portrait
      const configContent = {
        portraits: {
          [p.id]: {
            texturefile: `gfx/models/portraits/${p.id}/${p.id}.dds`
          }
        },
        portrait_groups: {
          [p.id]: {
            default: p.id,
            game_setup: {
              add: {
                portraits: [
                  p.id
                ]
              }
            },

            species: {
              add: {
                portraits: [
                  p.id
                ]
              }
            },

            leader: {
              add: {
                portraits: [
                  p.id
                ]
              }
            },

            ruler: {
              add: {
                portraits: [
                  p.id
                ]
              }
            }

          }
        }
      }

      const configBytes = parser.write((writer) => {
        writeObject(writer, configContent);
      });
      const configString = new TextDecoder().decode(configBytes);
      console.log(configString);
      gfxConfig.file(`${p.id}.txt`, configString);
    });

    zip.generateAsync({type: 'blob'}).then((content) => {
      saveAs(content, 'stellaris_portraits.zip');
    });

    toast.update(t, {render: 'Zip file generated!', type: 'success', isLoading: false, autoClose: 3000});
  }

  const handleGeneratePortrait = () => {
    // Add new portrait with default values to state

    const newPortrait = {
      id: generateId(10), // Generate a random string ID of length 10
      type: "MAMMALIAN", // Placeholder for actual species type
      imageData: null // Placeholder for actual image data
    };

    setPortraits([...portraits, newPortrait]);

    toast.success('Portrait generated!');
  }

  const handleUploadImage = (portraitId) => {
    // Not sure if this is the best way to do this, but it works for now.
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.dds';
    fileInput.onchange = (event) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const imageData = e.target.result; // Base64-encoded image data

          // TODO: Find a better way to validate the file format.
          // if (!imageData.includes('-dds')) {
          //   toast.error('Invalid file format! Please upload a .dds file.');
          //   return;
          // }

          setPortraits(portraits.map(p =>
            p.id === portraitId ? {...p, imageData} : p
          ));
        };
        reader.readAsDataURL(file);
      }
    };
    fileInput.click();
  }

  return (
    <>
      <ToastContainer/>
      <div className="content">
        <h1>Stellaris Portrait Creator</h1>
        <p>A tool to create static portraits for Stellaris</p>
        <p>
          <a href="https://github.com/Artucuno/stellaris-portrait-creator"><FontAwesomeIcon icon={faGithub}/></a>
        </p>
      </div>
      <button onClick={handleGeneratePortrait}><FontAwesomeIcon icon={faPlus}/> New Portrait</button>
      {" | "}
      <button onClick={createZipAndDownload}>Download Zip <FontAwesomeIcon icon={faDownload}/></button>

      <hr/>
      <h2><FontAwesomeIcon icon={faUser}/> Portraits {portraits?.length >= 1 && `(${portraits.length})`}</h2>
      <div className="portrait-list">
        {portraits.map((portrait) => (
          <div key={portrait.id} className="portrait-item border p-2">
            <div className="portrait-content">
              <p>ID: {portrait.id}</p>
              <p>Type:
                <select onChange={(e) => {
                  const newType = e.target.value;
                  setPortraits(portraits.map(p =>
                    p.id === portrait.id ? {...p, type: newType} : p
                  ));
                }
                }>
                  <option value="HUMAN" selected={portrait.type === "HUMAN"}>HUMANOID</option>
                  <option value="MACHINE" selected={portrait.type === "MACHINE"}>MACHINE</option>
                  <option value="MAMMALIAN" selected={portrait.type === "MAMMALIAN"}>MAMMALIAN</option>
                  <option value="REPTILIAN" selected={portrait.type === "REPTILIAN"}>REPTILIAN</option>
                  <option value="AVIAN" selected={portrait.type === "AVIAN"}>AVIAN</option>
                  <option value="ARTHROPOID" selected={portrait.type === "ARTHROPOID"}>ARTHROPOID</option>
                  <option value="MOLLUSCOID" selected={portrait.type === "MOLLUSCOID"}>MOLLUSCOID</option>
                  <option value="FUNGOID" selected={portrait.type === "FUNGOID"}>FUNGOID</option>
                  <option value="PLANTOID" selected={portrait.type === "PLANTOID"}>PLANTOID</option>
                  <option value="LITHOID" selected={portrait.type === "LITHOID"}>LITHOID</option>
                  <option value="NECROID" selected={portrait.type === "NECROID"}>NECROID</option>
                  <option value="AQUATIC" selected={portrait.type === "AQUATIC"}>AQUATIC</option>
                  <option value="TOXOID" selected={portrait.type === "TOXOID"}>TOXOID</option>
                  <option value="CYBERNETIC" selected={portrait.type === "CYBERNETIC"}>CYBERNETIC</option>
                  <option value="SYNTHETIC" selected={portrait.type === "SYNTHETIC"}>SYNTHETIC</option>
                  <option value="BIOGENESIS" selected={portrait.type === "BIOGENESIS"}>BIOGENESIS</option>
                  <option value="PSIONIC" selected={portrait.type === "PSIONIC"}>PSIONIC</option>
                  <option value="INFERNAL" selected={portrait.type === "INFERNAL"}>INFERNAL</option>
                </select>
              </p>
            </div>
            {/* Display the image if available (TODO: Find a way to preview dds files) */}
            {/*{portrait.imageData && (
              <img src={portrait.imageData} alt={`Portrait ${portrait.id}`}/>
            )}*/}
            <div className="portrait-footer">
              <button className="upload-button" onClick={() => handleUploadImage(portrait.id)}>
                <FontAwesomeIcon icon={faUpload}/> Upload Image {portrait?.imageData && (
                <FontAwesomeIcon icon={faCheckCircle} className="green"/>
              )}
              </button>
              {" | "}
              <button onClick={() => {
                // Remove portrait from state
                setPortraits(portraits.filter(p => p.id !== portrait.id));
                toast.info('Portrait deleted');
              }}>Delete <FontAwesomeIcon icon={faTrash}/>
              </button>
            </div>
          </div>
        ))}
      </div>
      <hr/>
      <div className="log"/>
    </>
  );
};

export default App;
