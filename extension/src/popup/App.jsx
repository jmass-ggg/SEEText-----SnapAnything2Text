import "./App.css";

function App(){
    const startCapture=async () =>{
        try{
            const [tab]=await chrome.tabs.query({
                active:true,
                currentWindow: true
            });
            if(!tab.id){
                return;
            }
            await chrome.scripting.executeScript({
                target:{
                    tabId:tab.id
                },
                files:['content.js']
            })
            await chrome.tabs.sendMessage(
                tab.id,
                {
                    type:"START_SELECTION"
                }
            );
            window.close();
        }
        catch(error){
            console.error(
                "Capture error",
                error
            );
        }
    };
    return(
        <div className="container">
            <h2>code <span>Capture</span></h2>
            <p>Select any region from your screen</p>
            <button onClick={startCapture}>
                Capture region
            </button>
        </div>
    )
}