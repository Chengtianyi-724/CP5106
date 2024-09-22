'use client'
import { useState } from 'react'
import * as tf from '@tensorflow/tfjs'
import * as Papa from 'papaparse'
import { read, utils } from 'xlsx'
import * as d3 from 'd3'
import { useToast } from '@/hooks/use-toast'

export default function Home() {
    const [fileData, setFileData] = useState(null)
    const [columns, setColumns] = useState([])
    const [selectedX, setSelectedX] = useState('')
    const [selectedY, setSelectedY] = useState('')
    const [modelType, setModelType] = useState('linearRegression')
    const [split, setSplit] = useState(0.2)
    const [testInput, setTestInput] = useState('')
    const [modelObj, setModelObj] = useState(null) // Use state for model object
    const {toast} = useToast()

    // Handle file upload (CSV or Excel)
    const handleFileUpload = (event) => {
        const file = event.target.files[0]
        const reader = new FileReader()
        const fileExt = file.name.split('.').pop()

        reader.onload = (e) => {
            if (fileExt === 'csv') {
                Papa.parse(e.target.result, {
                    header: true,
                    dynamicTyping: true,
                    complete: (result) => {
                        setFileData(result.data)
                        setColumns(Object.keys(result.data[0]))
                    },
                })
            } else if (fileExt === 'xlsx') {
                const workbook = read(e.target.result, { type: 'binary' })
                const worksheet = workbook.Sheets[workbook.SheetNames[0]]
                const jsonData = utils.sheet_to_json(worksheet, { header: 1 })
                const headers = jsonData[0]
                const rows = jsonData.slice(1)
                setFileData(rows.map((row) => Object.fromEntries(row.map((cell, i) => [headers[i], cell]))))
                setColumns(headers)
            }
        }

        reader.readAsBinaryString(file)
    }

    // Handle plotting
    const handlePlot = () => {
        if (!selectedX || !selectedY || !fileData) return

        const svg = d3.select('#plot').attr('width', 500).attr('height', 300)
        svg.selectAll('*').remove()

        const data = fileData.map((row) => ({
            x: row[selectedX],
            y: row[selectedY],
        }))

        const xScale = d3.scaleLinear().domain(d3.extent(data, (d) => d.x)).range([0, 500])
        const yScale = d3.scaleLinear().domain(d3.extent(data, (d) => d.y)).range([300, 0])

        svg
            .selectAll('circle')
            .data(data)
            .enter()
            .append('circle')
            .attr('cx', (d) => xScale(d.x))
            .attr('cy', (d) => yScale(d.y))
            .attr('r', 5)
            .style('fill', '#3b82f6')
    }

    // Train model (TensorFlow.js)
    const handleTrainModel = async () => {
        if (!selectedX || !selectedY || !fileData) {
            toast({ title: 'Please select columns for X and Y and upload data.' })
            return
        }

        const inputs = fileData.map((row) => row[selectedX])
        const labels = fileData.map((row) => row[selectedY])

        const xs = tf.tensor2d(inputs, [inputs.length, 1])
        const ys = tf.tensor2d(labels, [labels.length, 1])

        // Choose model type
        let model
        if (modelType === 'linearRegression') {
            model = tf.sequential()
            model.add(tf.layers.dense({ units: 1, inputShape: [1] }))
            model.compile({ optimizer: 'sgd', loss: 'meanSquaredError' })

            await model.fit(xs, ys, {
                epochs: 100,
                batchSize: 32,
                validationSplit: split,
                callbacks: {
                    onEpochEnd: (epoch, logs) => {
                        toast({
                            title: `Epoch ${epoch + 1} complete.`,
                            description: `Loss: ${logs.loss.toFixed(4)}`,
                        })
                    },
                },
            })

            toast({ title: 'Training complete!' })
        } else if (modelType === 'neuralNetwork') {
            model = tf.sequential()
            model.add(tf.layers.dense({ units: 10, inputShape: [1], activation: 'relu' }))
            model.add(tf.layers.dense({ units: 1 }))

            model.compile({ optimizer: 'adam', loss: 'meanSquaredError' })

            await model.fit(xs, ys, {
                epochs: 150,
                batchSize: 32,
                validationSplit: split,
                callbacks: {
                    onEpochEnd: (epoch, logs) => {
                        toast({
                            title: `Epoch ${epoch + 1} complete.`,
                            description: `Loss: ${logs.loss.toFixed(4)}`,
                        })
                    },
                },
            })

            toast({ title: 'Training complete!' })
        } else if (modelType === 'decisionTree') {
            toast({ title: 'Decision Tree is not implemented yet.' })
            return
        }

        setModelObj(model) // Save trained model in state
    }

    // Handle prediction
    const handlePredict = () => {
        if (!testInput) {
            toast({ title: 'Please provide test data for prediction.' })
            return
        }

        if (!modelObj) {
            toast({ title: 'Model not trained yet.' })
            return
        }

        const prediction = modelObj.predict(tf.tensor2d([parseFloat(testInput)], [1, 1]))
        const predictedValue = prediction.arraySync()[0][0]
        toast({
            title: 'Prediction',
            description: `For input ${testInput}, the predicted value is ${predictedValue.toFixed(4)}`,
        })
    }

    return (
        <div className="flex flex-row h-screen">
            {/* Left Side: Inputs */}
            <div className="w-1/3 p-8 bg-gray-100 border-r border-gray-300">
                <h1 className="text-2xl font-bold mb-6 text-blue-500">Train a Machine Learning Model</h1>

                <input type="file" onChange={handleFileUpload} className="mb-4 p-2 border rounded-md w-full" />

                {columns.length > 0 && (
                    <div className="mb-6">
                        <div className="mb-4">
                            <label className="block mb-2 text-gray-700">Select X Column</label>
                            <select onChange={(e) => setSelectedX(e.target.value)} className="p-2 border rounded-md w-full">
                                <option value="">Select X</option>
                                {columns.map((col) => (
                                    <option key={col} value={col}>
                                        {col}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="mb-4">
                            <label className="block mb-2 text-gray-700">Select Y Column</label>
                            <select onChange={(e) => setSelectedY(e.target.value)} className="p-2 border rounded-md w-full">
                                <option value="">Select Y</option>
                                {columns.map((col) => (
                                    <option key={col} value={col}>
                                        {col}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="mb-4">
                            <label className="block mb-2 text-gray-700">Select Model</label>
                            <select onChange={(e) => setModelType(e.target.value)} className="p-2 border rounded-md w-full">
                                <option value="linearRegression">Linear Regression</option>
                                <option value="neuralNetwork">Neural Network</option>
                                <option value="decisionTree">Decision Tree (Future)</option>
                            </select>
                        </div>

                        <div className="mb-4">
                            <label className="block mb-2 text-gray-700">Validation Split (e.g., 0.2 for 20%)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={split}
                                onChange={(e) => setSplit(parseFloat(e.target.value))}
                                className="p-2 border rounded-md w-full"
                            />
                        </div>

                        <button
                            onClick={handlePlot}
                            className="p-2 bg-blue-500 text-white rounded-md w-full mb-4 hover:bg-blue-600"
                        >
                            Plot Data
                        </button>

                        <button onClick={handleTrainModel} className="p-2 bg-green-500 text-white rounded-md w-full hover:bg-green-600">
                            Train Model
                        </button>

                        <div className="mt-6">
                            <label className="block mb-2 text-gray-700">Test Data (for prediction)</label>
                            <input
                                type="text"
                                value={testInput}
                                onChange={(e) => setTestInput(e.target.value)}
                                className="p-2 border rounded-md w-full"
                            />
                            <button onClick={handlePredict} className="p-2 bg-yellow-500 text-white rounded-md w-full mt-2 hover:bg-yellow-600">
                                Predict
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Right Side: Visualizations and Output */}
            <div className="w-2/3 p-8">
                <h2 className="text-2xl font-bold mb-4 text-green-500">Data Visualization & Model Output</h2>
                <svg id="plot" className="border w-full h-64 mb-8"></svg>
            </div>
        </div>
    )
}
