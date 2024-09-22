import { NextApiRequest, NextApiResponse } from 'next';
import * as tf from '@tensorflow/tfjs-node';

// Define the supported model types
type ModelType = 'linear-regression' | 'logistic-regression' | 'neural-network';

// Define the expected request body structure
interface RequestBody {
  modelType: ModelType;
  parameters: number[];
  train?: boolean;
}

// Define the response data structure
interface ResponseData {
  prediction: number | number[];
  modelUsed: ModelType;
  trainingMetrics?: {
    loss: number;
    accuracy?: number;
  };
}

// Helper function to generate sample data
function generateData(modelType: ModelType, sampleSize: number = 1000): [tf.Tensor2D, tf.Tensor2D] {
  switch (modelType) {
    case 'linear-regression':
      const x = tf.randomUniform([sampleSize, 1]);
      const y = x.mul(2).add(1).add(tf.randomNormal([sampleSize, 1], 0, 0.1));
      return [x, y];
    case 'logistic-regression':
      const features = tf.randomNormal([sampleSize, 2]);
      const labels = features.sum(1).greater(0).reshape([-1, 1]).toFloat();
      return [features, labels];
    case 'neural-network':
      const inputs = tf.randomNormal([sampleSize, 3]);
      const outputs = inputs.sum(1).pow(2).reshape([-1, 1]);
      return [inputs, outputs];
    default:
      throw new Error('Invalid model type');
  }
}

// Helper function to create, train, and run models
async function runModel(modelType: ModelType, parameters: number[], train: boolean = false): Promise<{ prediction: number | number[], metrics?: { loss: number, accuracy?: number } }> {
  let model: tf.LayersModel;
  const input = tf.tensor2d([parameters]);

  switch (modelType) {
    case 'linear-regression':
      model = tf.sequential({
        layers: [tf.layers.dense({ units: 1, inputShape: [1] })]
      });
      model.compile({ optimizer: 'sgd', loss: 'meanSquaredError' });
      break;
    case 'logistic-regression':
      model = tf.sequential({
        layers: [tf.layers.dense({ units: 1, inputShape: [2], activation: 'sigmoid' })]
      });
      model.compile({ optimizer: 'adam', loss: 'binaryCrossentropy', metrics: ['accuracy'] });
      break;
    case 'neural-network':
      model = tf.sequential({
        layers: [
          tf.layers.dense({ units: 10, inputShape: [3], activation: 'relu' }),
          tf.layers.dense({ units: 5, activation: 'relu' }),
          tf.layers.dense({ units: 1 })
        ]
      });
      model.compile({ optimizer: 'adam', loss: 'meanSquaredError' });
      break;
    default:
      throw new Error('Invalid model type');
  }

  let metrics;
  if (train) {
    const [xTrain, yTrain] = generateData(modelType);
    const history = await model.fit(xTrain, yTrain, {
      epochs: 100,
      validationSplit: 0.2,
      verbose: 0
    });
    metrics = {
      loss: history.history.loss[history.history.loss.length - 1],
      accuracy: history.history.acc ? history.history.acc[history.history.acc.length - 1] : undefined
    };
  }

  const prediction = model.predict(input) as tf.Tensor;
  const result = await prediction.array();
  return { prediction: result[0], metrics };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseData | { error: string }>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { modelType, parameters, train = false }: RequestBody = req.body;

    if (!modelType || !parameters || !Array.isArray(parameters)) {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const { prediction, metrics } = await runModel(modelType, parameters, train);

    const response: ResponseData = { prediction, modelUsed: modelType };
    if (metrics) {
      response.trainingMetrics = metrics;
    }

    res.status(200).json(response);
  } catch (error) {
    console.error('Error in ML API:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}