export type Role = "VIEWER" | "ANALYST";

export type Session = {
  username: string;
  role: Role;
  expiresAt: number;
};

export type HousingFeatures = {
  square_footage: number;
  bedrooms: number;
  bathrooms: number;
  year_built: number;
  lot_size: number;
  distance_to_city_center: number;
  school_rating: number;
};

export type EstimateResponse = {
  request_id: string;
  estimated_price: number;
  model_version: string;
  estimated_at_utc: string;
};

export type ModelInfo = {
  model_name: string;
  model_type: string;
  model_version: string;
  performance: {
    holdout_metrics: {
      mae: number;
      rmse: number;
      r2: number;
    };
  };
};

export type PropertyRecord = {
  id: number;
  squareFootage: number;
  bedrooms: number;
  bathrooms: number;
  yearBuilt: number;
  lotSize: number;
  distanceToCityCenter: number;
  schoolRating: number;
  price: number;
};

export type BedroomSegment = {
  bedrooms: number;
  propertyCount: number;
  averagePrice: number;
};

export type PriceBucket = {
  lowerBound: number;
  upperBound: number;
  propertyCount: number;
};

export type MarketAnalysis = {
  propertyCount: number;
  averagePrice: number;
  medianPrice: number;
  minimumPrice: number;
  maximumPrice: number;
  averageSquareFootage: number;
  averageSchoolRating: number;
  averageDistanceToCityCenter: number;
  byBedrooms: BedroomSegment[];
  priceDistribution: PriceBucket[];
};

export type PagedProperties = {
  content: PropertyRecord[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type WhatIfResponse = {
  baselinePrediction: number;
  scenarioPrediction: number;
  absoluteChange: number;
  percentageChange: number;
  modelVersion: string;
};
